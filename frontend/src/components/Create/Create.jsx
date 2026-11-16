import React, { Component, createRef } from "react";
import { v4 as uuid } from "uuid";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import SettingsSection from "../SettingsSection/SettingsSection";
import { InfoLabel } from "../Common/FormFields";
import { PickerLayout, PickerPane } from "../Common/Picker";
import { api } from "../../api";
import "../CreateSeq/CreateSeq.css";

export default class Create extends Component {
  constructor(props) {
    super(props);

    if (this.props.isEdit) {
      var info = this.props.settings.buckets.find(({ id }) => id === this.props.id.toString());

      this.state = {
        id: info.id,
        media: info.media,
        name: info.name,
        directoryList: [],
        selectedList: [],
        selectedFileList: [],
        root: this.props.settings.settings.loc,
        currentDir: info.source === "2" ? info.dir : this.props.settings.settings.loc,
        dirTree: [],
        isError: false,
        isSaved: false,
        isIncomplete: false,
        player: false,
        videoIndex: 0,
        tempList: [],
        tempLength: 0,
        source: info.source ?? "1",
        sourceDir: info.dir ?? "",
        isDefault: info.id === this.props.settings.settings.defaultBucket,
        default: false,
        removeDefault: false,
        includeSub: info.includeSub ?? false,
      };
    } else {
      this.state = {
        media: [],
        name: "",
        directoryList: [],
        selectedList: [],
        selectedFileList: [],
        root: this.props.settings.settings.loc,
        currentDir: this.props.settings.settings.loc,
        dirTree: [],
        isError: false,
        isSaved: false,
        isIncomplete: false,
        player: false,
        videoIndex: 0,
        tempList: [],
        tempLength: 0,
        source: "1",
        sourceDir: "",
        isDefault: false,
        default: false,
        removeDefault: false,
        includeSub: false,
      };
    }

    this.videoRef = createRef();
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.handleStreamer = this.handleStreamer.bind(this);
    this.fetchDirectoryList = this.fetchDirectoryList.bind(this);
  }

  formRef = createRef();

  componentDidMount() {
    // The editor opens below the cards; bring it into view (mainly for phones)
    this.formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    api
      .post(
        "backend/directory",
        { dir: `${this.state.source === "2" ? this.state.currentDir : this.state.root}`, isSub: false },
        { timeout: 3000 },
      )
      .then((json) => {
        // Built from scratch (not appended) so a second mount, e.g. React StrictMode in development,
        // doesn't add the root folder twice
        const updatedDirTree = [
          this.state.root,
          ...(this.state.source === "2"
            ? this.state.currentDir
                .replace(this.state.root, "")
                .split("/")
                .filter((dir) => dir !== "")
            : []),
        ];
        this.setState({ dirTree: updatedDirTree, directoryList: json });
      })
      .catch((err) => this.setState({ isError: true, errorRes: err.data }));
  }

  componentDidUpdate(prevProps) {
    // Check if the settings prop has changed
    if (this.props.settings !== prevProps.settings) {
      // Find the relevant bucket if in edit mode
      if (this.props.isEdit) {
        const info = this.props.settings.buckets.find(({ id }) => id === this.props.id.toString());
        if (info) {
          this.setState(
            {
              media: info.media,
            },
            () => {
              try {
                this.fetchDirectoryList();
              } catch (err) {
                console.error("Error calling fetchDirectoryList:", err);
              }
            },
          );
        }
      } else {
        // Handle the default state for new items
        this.setState(
          {
            media: [],
          },
          () => {
            try {
              this.fetchDirectoryList();
            } catch (err) {
              console.error("Error calling fetchDirectoryList:", err);
            }
          },
        );
      }
    }
  }

  handleClickFiles = (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    const temp = JSON.parse(target.value);

    this.setState((prevState) => {
      const newSelectedList = prevState.selectedFileList.includes(temp)
        ? prevState.selectedFileList.filter((item) => item !== temp)
        : [...prevState.selectedFileList, temp];
      return { selectedFileList: newSelectedList };
    });
  };

  handleClick = (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    var temp = JSON.parse(target.value);

    if (temp.isDir) {
      if (temp.name === "..") {
        this.setState(
          (prevState) => {
            // Remove the last directory from the path
            const updatedDirTree = prevState.dirTree.slice(0, -1);
            const tempDir = updatedDirTree.join("/"); // Construct the new directory path
            return {
              dirTree: updatedDirTree,
              currentDir: tempDir,
              selectedList: [], // Clear selected list when navigating directories
            };
          },
          () => {
            // Callback to handle state changes and perform subsequent actions
            this.fetchDirectoryList();
          },
        );
      } else {
        this.setState(
          (prevState) => {
            // Add the new directory to the path
            const updatedDirTree = [...prevState.dirTree, temp.name];
            const tempDir = updatedDirTree.join("/"); // Construct the new directory path
            return {
              dirTree: updatedDirTree,
              currentDir: tempDir,
              selectedList: [], // Clear selected list when navigating directories
            };
          },
          () => {
            // Callback to handle state changes and perform subsequent actions
            this.fetchDirectoryList();
          },
        );
      }
    } else {
      this.setState((prevState) => {
        const newSelectedList = prevState.selectedList.includes(temp.name)
          ? prevState.selectedList.filter((item) => item !== temp.name)
          : [...prevState.selectedList, temp.name];
        return { selectedList: newSelectedList };
      });
    }
  };

  fetchDirectoryList = () => {
    api
      .post("backend/directory", { dir: `${this.state.currentDir}`, isSub: false }, { timeout: 3000 })
      .then((json) => this.setState({ directoryList: json }))
      .catch((err) => this.setState({ isError: true, errorRes: err.data }));
  };

  handleAdd = (e) => {
    e.preventDefault();
    const newDir = (this.state.dirTree.length > 1 ? "/" : "") + this.state.dirTree.slice(1).join("/");
    const newMediaList = this.state.selectedList.map((element) => ({ file: element, dir: newDir }));
    this.setState((prevState) => ({
      media: [...prevState.media, ...newMediaList],
    }));
  };

  handleRemove = (e) => {
    e.preventDefault();
    this.setState((prevState) => {
      const newMedia = [...prevState.media]; // Create a copy of the current media state

      prevState.selectedFileList.forEach((file) => {
        const index = newMedia.findIndex((item) => item.file === file); // Find the index of the first matching element
        if (index !== -1) {
          newMedia.splice(index, 1); // Remove the first matching element
        }
      });

      return { media: newMedia, selectedFileList: [] }; // Update state with the modified media array and clear selectedFileList
    });
  };

  handleSelectAll = () => {
    var newList = [];
    this.state.directoryList.forEach((element) => {
      if (!element.isDir) {
        newList.push(element.name);
      }
    });
    this.setState({ selectedList: newList });
  };

  handleSelectNone = () => {
    this.setState({ selectedList: [] });
  };

  handleName = (e) => {
    this.setState({ name: e.target.value.toString(), isSaved: false });
  };

  handleFormSubmit = (e) => {
    e.preventDefault();

    this.setState({ isIncomplete: false });

    if (this.state.name === "" || (this.state.media.length === 0 && this.state.source === "1")) {
      this.setState({ isIncomplete: true });
      return;
    }

    var settings = { ...this.props.settings };

    if (!settings.buckets) settings.buckets = [];

    var temp = {};

    if (this.props.isEdit) {
      temp.id = this.state.id;
    } else {
      temp.id = uuid().toString();
    }
    temp.name = this.state.name;
    temp.media = this.state.media;
    temp.source = this.state.source;
    temp.dir = this.state.currentDir;
    temp.includeSub = this.state.includeSub;

    if (this.state.default) {
      settings.settings.defaultBucket = temp.id; // (a new bucket only gets its id above)
    }

    if (this.state.removeDefault) {
      settings.settings.defaultBucket = "";
    }

    if (this.props.isEdit) {
      const index = settings.buckets.findIndex(({ id }) => id === this.state.id);
      settings.buckets.splice(index, 1, temp);
    } else {
      settings.buckets.push(temp);
    }

    api
      .saveSettings(settings)
      .then(async () => {
        this.setState({ isSaved: true });
        await api.updatePrerolls();
        await api.get("backend/monitor");
      })
      .catch((err) => this.setState({ error: err.body || err.message }));

    this.props.saved();
  };

  handleStreamer = () => {
    this.setState(
      {
        player: true,
        videoIndex: 0,
        tempList: this.state.selectedList.sort(([fileA], [fileB]) => fileA.localeCompare(fileB)),
        tempLength: this.state.selectedList.length,
      },
      () => {
        if (this.videoRef.current && this.state.tempList.length > 0) {
          // Set the initial video source
          this.videoRef.current.src = `backend/streamer${this.state.currentDir}/${
            this.state.tempList[this.state.videoIndex]
          }`;
          this.videoRef.current.load();
          this.videoRef.current.play(); // Start playing the first video
        }
      },
    );
  };

  handleVideoEnded = () => {
    this.setState((prevState) => {
      const nextIndex = prevState.videoIndex + 1;

      if (nextIndex < prevState.tempLength) {
        // Update the video index and set the next video source
        this.videoRef.current.src = `backend/streamer${this.state.currentDir}/${prevState.tempList[nextIndex]}`;
        this.videoRef.current.load();
        this.videoRef.current.play(); // Start playing the next video
      } else {
        // All videos have been played
        this.setState({ player: false });
        return { videoIndex: nextIndex };
      }

      return { videoIndex: nextIndex };
    });
  };

  handleStop = () => {
    this.setState({ player: false });
  };

  handleSource = (e) => {
    this.setState({ source: e.target.value.toString() });
  };

  handleDefault = (e) => {
    this.setState({ default: e.target.checked, isSaved: false });
  };

  handleRemoveDefault = (e) => {
    this.setState({ removeDefault: e.target.checked, isSaved: false });
  };

  handleSub = (e) => {
    this.setState({ includeSub: e.target.checked });
  };

  render() {
    const variant = this.props.isDarkMode ? "outline-light" : "outline-secondary";

    // Folder browser: the right-hand list in Manual mode, the whole picker in Directory mode
    const browser = (
      <PickerPane
        title={this.state.currentDir}
        toolbar={
          this.state.source === "1" && (
            <>
              <Button onClick={this.handleSelectAll} variant={variant} size="sm">
                Select All
              </Button>
              <Button onClick={this.handleSelectNone} variant={variant} size="sm">
                Select None
              </Button>
              <Button onClick={this.handleStreamer} variant={variant} size="sm">
                Preview
              </Button>
            </>
          )
        }
      >
        {this.state.currentDir !== `${this.state.root}` ? (
          <ListGroup.Item
            value={JSON.stringify({ name: "..", isDir: true })}
            action
            onClick={this.handleClick}
            className="listgroup-custom-b"
          >
            ../
          </ListGroup.Item>
        ) : null}
        {this.state.directoryList ? (
          this.state.directoryList.map((file) =>
            file.isDir ? (
              <ListGroup.Item
                key={file.name}
                value={JSON.stringify(file)}
                action
                onClick={this.handleClick}
                className="listgroup-custom-b"
              >
                {file.name}/
              </ListGroup.Item>
            ) : this.state.source === "1" ? (
              <ListGroup.Item
                key={file.name}
                value={JSON.stringify(file)}
                action
                active={this.state.selectedList.includes(file.name)}
                onClick={this.handleClick}
                className={
                  this.state.selectedList.includes(file.name) ? "listgroup-custom-active" : "listgroup-custom-b"
                }
              >
                {file.name}
              </ListGroup.Item>
            ) : null,
          )
        ) : (
          <ListGroup.Item className="listgroup-custom-s">Directory does not exist</ListGroup.Item>
        )}
      </PickerPane>
    );

    return (
      <Form ref={this.formRef} className={`form-content editor-form ${this.props.isDarkMode ? "dark-mode" : ""}`}>
        <SettingsSection title={this.props.isEdit ? "Edit Bucket" : "New Bucket"} isDarkMode={this.props.isDarkMode}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Label htmlFor="name">Name</Form.Label>
              <Form.Control value={this.state.name} id="name" name="name" onChange={this.handleName} size="sm" />
            </Col>
            <Col xs={12} md={6}>
              <InfoLabel
                tip={
                  <>
                    This setting selects whether you wish to manually add files to the bucket or just use a specific
                    directory.
                    <br />
                    <br />
                    Manual: You select which files are added to your bucket from this page. This allows you to mix and
                    match files from different directories.
                    <br />
                    <br />
                    Directory: Select a directory to bind to the bucket and Preroll Plus will randomly select files from
                    that directory when creating the Preroll entry.
                    <br />
                    <br />
                    Note: Using Directory as an option will not allow you to add weights to each file. To accomplish
                    weights you will need to create duplicates of the file in the file system.
                  </>
                }
              >
                Source of Files
              </InfoLabel>
              <div>
                <Form.Check
                  inline
                  type="radio"
                  label="Manual"
                  value="1"
                  id="source-1"
                  name="source"
                  onChange={this.handleSource}
                  checked={this.state.source === "1"}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Directory"
                  value="2"
                  id="source-2"
                  name="source"
                  onChange={this.handleSource}
                  checked={this.state.source === "2"}
                />
              </div>
            </Col>
            <Col xs={12}>
              {this.state.isDefault ? (
                <Form.Check
                  type="switch"
                  checked={this.state.removeDefault}
                  id="removeDefault"
                  name="removeDefault"
                  onChange={this.handleRemoveDefault}
                  label={
                    <InfoLabel
                      className="mb-0"
                      tip="This will remove the bucket as the default and there will be no default bucket until another one is set."
                    >
                      Remove as default bucket
                    </InfoLabel>
                  }
                />
              ) : (
                <Form.Check
                  type="switch"
                  checked={this.state.default}
                  id="default"
                  name="default"
                  onChange={this.handleDefault}
                  label={
                    <InfoLabel
                      className="mb-0"
                      tip="This will set this bucket as the current default which will automatically be added to a newly created sequence."
                    >
                      Default bucket
                    </InfoLabel>
                  }
                />
              )}
            </Col>
          </Row>
        </SettingsSection>

        <SettingsSection
          title={this.state.source === "1" ? "Files" : "Folder"}
          tooltip={
            this.state.source === "1"
              ? "Select files on the right and press the arrow to add them. Adding a file more than once makes it play more often; the percentage shows how often each file is picked."
              : "Browse to the folder this bucket uses. Each time, Preroll Plus picks a random file from it."
          }
          isDarkMode={this.props.isDarkMode}
        >
          {!this.props.sockConnected && (
            <div className="error-text small mb-2">
              {this.props.cannotConnect
                ? "Unable to reconnect. Restart server then refresh page."
                : "Lost connection to backend, trying to reconnect..."}
            </div>
          )}
          {this.state.source === "2" && (
            <Form.Check
              type="checkbox"
              id="includeSub"
              label="Include Subdirectories"
              checked={this.state.includeSub}
              onChange={this.handleSub}
              className="mb-3"
            />
          )}
          {this.state.source === "1" ? (
            <PickerLayout
              isDarkMode={this.props.isDarkMode}
              onAdd={this.handleAdd}
              addTitle="Add the selected files"
              chosen={
                <PickerPane
                  title="Files in bucket"
                  toolbar={
                    <Button onClick={this.handleRemove} variant={variant} size="sm">
                      Remove
                    </Button>
                  }
                >
                  {this.state.media.length === 0 ? (
                    <ListGroup.Item className="listgroup-custom-s">&lt;Add Files Here&gt;</ListGroup.Item>
                  ) : (
                    Object.entries(
                      this.state.media.reduce((acc, item) => {
                        acc[item.file] = (acc[item.file] || 0) + 1;
                        return acc;
                      }, {}),
                    )
                      .sort(([fileA], [fileB]) => fileA.localeCompare(fileB))
                      .map(([file, count]) => {
                        const dir = this.state.media.find((item) => item.file === file)?.dir || "";
                        const percentage = ((count / this.state.media.length) * 100).toFixed(1);
                        const selected = this.state.selectedFileList.includes(file);
                        return (
                          <ListGroup.Item
                            key={file}
                            value={JSON.stringify(file)}
                            action
                            active={selected}
                            onClick={this.handleClickFiles}
                            className={`d-flex justify-content-between gap-2 ${
                              selected ? "listgroup-custom-active" : "listgroup-custom-s"
                            }`}
                          >
                            <span className="min-w-0">
                              {file} {count > 1 ? `(${count})` : <></>}
                              <br />
                              <div className="directory-loc">{dir !== "" ? dir : "/"}</div>
                            </span>
                            <Badge bg={this.props.isDarkMode ? "secondary" : "primary"} className="align-self-start">
                              {percentage}%
                            </Badge>
                          </ListGroup.Item>
                        );
                      })
                  )}
                </PickerPane>
              }
              available={browser}
            />
          ) : (
            <div className="folder-browser">{browser}</div>
          )}
          {this.state.player && (
            <div className="mt-3">
              <video
                className="preview-player"
                controls
                controlsList="nodownload"
                autoPlay
                ref={this.videoRef}
                onEnded={this.handleVideoEnded}
              >
                Your browser does not support the video tag.
              </video>
              <div className="mt-2">
                <Button onClick={this.handleStop} variant={variant} size="sm">
                  Close Preview
                </Button>
              </div>
            </div>
          )}
        </SettingsSection>

        <div className="form-actions mb-4">
          <Button onClick={this.props.cancel} variant={variant}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" onClick={this.handleFormSubmit}>
            {this.props.isEdit ? "Update" : "Save"}
          </Button>
          {this.state.isIncomplete && (
            <i className="error-text">
              There must be at least one item in the list and/or a bucket name must be filled.
            </i>
          )}
          {this.state.isSaved && <i className="conf-text">Settings saved.</i>}
        </div>
      </Form>
    );
  }
}
