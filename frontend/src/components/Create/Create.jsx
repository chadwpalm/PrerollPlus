import React, { Component, createRef } from "react";
import { v4 as uuid } from "uuid";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import LeftArrow from "bootstrap-icons/icons/arrow-left.svg";
import Image from "react-bootstrap/Image";
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
      };
    }

    this.videoRef = createRef();
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.handleStreamer = this.handleStreamer.bind(this);
    this.fetchDirectoryList = this.fetchDirectoryList.bind(this);
  }

  componentDidMount() {
    var xhr = new XMLHttpRequest();
    xhr.timeout = 3000;
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // request successful
          var response = xhr.responseText,
            json = JSON.parse(response);

          this.setState((prevState) => {
            const updatedDirTree = [
              ...prevState.dirTree,
              this.state.root,
              ...(this.state.source === "2"
                ? this.state.currentDir
                    .replace(this.state.root, "")
                    .split("/")
                    .filter((dir) => dir !== "")
                : []),
            ];
            return {
              dirTree: updatedDirTree,
              directoryList: json,
            };
          });
        } else {
          // error
          this.setState({
            isError: true,
            errorRes: JSON.parse(xhr.responseText),
          });
        }
      }
    });
    xhr.open("POST", "/backend/directory", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(
      JSON.stringify({
        dir: `${this.state.source === "2" ? this.state.currentDir : this.state.root}`,
      })
    );
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
            }
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
          }
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
          }
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
          }
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
    var xhr = new XMLHttpRequest();
    xhr.timeout = 3000;
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // request successful
          var response = xhr.responseText,
            json = JSON.parse(response);

          this.setState({ directoryList: json });
        } else {
          // error
          this.setState({
            isError: true,
            errorRes: JSON.parse(xhr.responseText),
          });
        }
      }
    });
    xhr.open("POST", "/backend/directory", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify({ dir: `${this.state.currentDir}` }));
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

    if (this.props.isEdit) {
      const index = settings.buckets.findIndex(({ id }) => id === this.state.id);
      settings.buckets.splice(index, 1, temp);
    } else {
      settings.buckets.push(temp);
    }

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", async () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ isSaved: true });

          const response = await fetch("/webhook", { method: "GET" });
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }

          const response2 = await fetch("/backend/monitor", { method: "GET" });
          if (!response2.ok) {
            throw new Error(`Response status: ${response.status}`);
          }
        } else {
          // error
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));

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
          this.videoRef.current.src = `/backend/streamer${this.state.currentDir}/${
            this.state.tempList[this.state.videoIndex]
          }`;
          this.videoRef.current.load();
          this.videoRef.current.play(); // Start playing the first video
        }
      }
    );
  };

  handleVideoEnded = () => {
    this.setState((prevState) => {
      const nextIndex = prevState.videoIndex + 1;

      if (nextIndex < prevState.tempLength) {
        // Update the video index and set the next video source
        this.videoRef.current.src = `/backend/streamer${this.state.currentDir}/${prevState.tempList[nextIndex]}`;
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

  truncateString = (str, num) => {
    return str.length > num ? str.slice(0, num) + "..." : str;
  };

  handleSource = (e) => {
    this.setState({ source: e.target.value.toString() });
  };

  render() {
    return (
      <Form className={`form-content ${this.props.isDarkMode ? "dark-mode" : ""}`}>
        <Form.Label for="name">Name of bucket &nbsp;&nbsp;</Form.Label>
        <Form.Control value={this.state.name} id="name" name="name" onChange={this.handleName} size="sm" />
        <div className="div-seperator" />
        <Form.Label for="source">Source of files &nbsp;&nbsp;</Form.Label>
        <OverlayTrigger
          placement="right"
          overlay={
            <Tooltip>
              This setting selects whether you wish to manually add files to the bucket or just use a specific
              directory.
              <br />
              <br />
              Manual: You select which files are added to your bucket from this page. This allows you to mix and match
              files from different directories.
              <br />
              <br />
              Directory: Select a directory to bind to the bucket and Preroll Plus will randomly select files from that
              directory when creating the Preroll entry.
              <br />
              <br />
              Note: Using Directory as an option will not allow you to add weights to each file. To accompish weights
              you will need to create duplicates of the file in the file system.
            </Tooltip>
          }
        >
          <img src={Info} className="image-info" alt="Info" />
        </OverlayTrigger>
        <div>
          <Form.Check
            inline
            type="radio"
            label="Manual"
            value="1"
            id="source"
            name="source"
            onChange={this.handleSource}
            size="sm"
            checked={this.state.source === "1"}
          />
          <Form.Check
            inline
            type="radio"
            label="Directory"
            value="2"
            id="source"
            name="source"
            onChange={this.handleSource}
            size="sm"
            checked={this.state.source === "2"}
          />
        </div>
        <div className="div-seperator" />
        <Row xs={1} sm="auto">
          {this.state.source === "1" ? (
            <>
              <Col>
                <Button
                  onClick={this.handleRemove}
                  type="submit"
                  variant={this.props.isDarkMode ? "outline-light" : "light"}
                >
                  Remove
                </Button>
                <div className="div-seperator" />
                {/* File Listing */}
                <div className="div-font">
                  <Card className="card-custom">
                    <Card.Title className="m-0 p-2">
                      <ListGroup.Item className="listgroup-header" variant="light">
                        Files in bucket
                      </ListGroup.Item>
                    </Card.Title>
                    <Card.Body className="m-0 p-0 card-body-custom">
                      <ListGroup variant="flush">
                        {this.state.media.length === 0 ? (
                          <ListGroup.Item className="listgroup-custom-s">&lt;Add Files Here&gt;</ListGroup.Item>
                        ) : (
                          Object.entries(
                            this.state.media.reduce((acc, item) => {
                              acc[item.file] = (acc[item.file] || 0) + 1;
                              return acc;
                            }, {})
                          )
                            .sort(([fileA], [fileB]) => fileA.localeCompare(fileB))
                            .map(([file, count]) => {
                              const dir = this.state.media.find((item) => item.file === file)?.dir || "";
                              const percentage = ((count / this.state.media.length) * 100).toFixed(1);
                              const truncatedFile = this.truncateString(file, 45);
                              return this.state.selectedFileList.includes(file) ? (
                                <ListGroup.Item
                                  key={file}
                                  value={JSON.stringify(file)}
                                  action
                                  active
                                  onClick={this.handleClickFiles}
                                  className="d-flex justify-content-between listgroup-custom-active"
                                >
                                  <span>
                                    {truncatedFile} {count > 1 ? `(${count})` : <></>}
                                    <br />
                                    <div className="directory-loc">{dir !== "" ? dir : "/"}</div>
                                  </span>
                                  <Badge bg={this.props.isDarkMode ? "secondary" : "primary"}>{percentage}%</Badge>
                                </ListGroup.Item>
                              ) : (
                                <ListGroup.Item
                                  key={file}
                                  value={JSON.stringify(file)}
                                  action
                                  onClick={this.handleClickFiles}
                                  className="d-flex justify-content-between listgroup-custom-s"
                                >
                                  <span>
                                    {file} {count > 1 ? `(${count})` : <></>}
                                    <br />
                                    <div className="directory-loc">{dir !== "" ? dir : "/"}</div>
                                  </span>

                                  <Badge bg={this.props.isDarkMode ? "secondary" : "primary"}>{percentage}%</Badge>
                                </ListGroup.Item>
                              );
                            })
                        )}
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </div>
                <div className="div-seperator" />
              </Col>
              <Col xs="auto" className="d-flex align-items-center justify-content-center">
                <Button onClick={this.handleAdd} variant={this.props.isDarkMode ? "outline-light" : "light"}>
                  <Image src={LeftArrow} alt="UpArrow" className="arrow-icon" />
                </Button>
                <div className="div-seperator" />
              </Col>
            </>
          ) : (
            ""
          )}
          <Col>
            {this.state.source === "1" ? (
              <>
                <Button onClick={this.handleSelectAll} variant={this.props.isDarkMode ? "outline-light" : "light"}>
                  Select All
                </Button>
                &nbsp;&nbsp;
                <Button onClick={this.handleSelectNone} variant={this.props.isDarkMode ? "outline-light" : "light"}>
                  Select None
                </Button>
                &nbsp;&nbsp;
                <Button onClick={this.handleStreamer} variant={this.props.isDarkMode ? "outline-light" : "light"}>
                  Preview
                </Button>
              </>
            ) : (
              ""
            )}

            <div className="div-seperator" />
            {/* Directory Listing */}

            <div className="div-font">
              {" "}
              {this.props.sockConnected ? (
                ""
              ) : this.props.cannotConnect ? (
                <div style={{ textAlign: "right", color: "red" }}>
                  Unable to reconnect. Restart server then refresh page.
                </div>
              ) : (
                <div style={{ textAlign: "right", color: "red" }}>
                  Lost connection to backend, trying to reconnect...
                </div>
              )}
              <Card className="card-custom">
                <Card.Title className="m-0 p-2">
                  <ListGroup.Item className="listgroup-header" variant="light">
                    {this.state.currentDir}
                  </ListGroup.Item>
                </Card.Title>
                <Card.Body className="m-0 p-0 card-body-custom">
                  <ListGroup variant="flush">
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
                      this.state.directoryList
                        .filter((file) => !file.name.startsWith(".") && !file.name.startsWith("@")) // Filter out files starting with . or @
                        .map((file) =>
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
                            this.state.selectedList.includes(file.name) ? (
                              <ListGroup.Item
                                key={file.name}
                                value={JSON.stringify(file)}
                                action
                                active
                                onClick={this.handleClick}
                                className="listgroup-custom-active"
                              >
                                {file.name}
                              </ListGroup.Item>
                            ) : (
                              <ListGroup.Item
                                key={file.name}
                                value={JSON.stringify(file)}
                                action
                                onClick={this.handleClick}
                                className="listgroup-custom-b"
                              >
                                {file.name}
                              </ListGroup.Item>
                            )
                          ) : (
                            ""
                          )
                        )
                    ) : (
                      <ListGroup.Item>Directory does not exist</ListGroup.Item> // Display this if directoryList is null or empty
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
            <div className="div-seperator" />
          </Col>
          {this.state.player ? (
            <Col>
              <Row style={{ height: "51px" }}></Row>
              <Row>
                <div>
                  <video
                    width="400"
                    controls
                    controlsList="nodownload"
                    autoPlay
                    ref={this.videoRef}
                    onEnded={this.handleVideoEnded}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </Row>
              <Button onClick={this.handleStop} variant={this.props.isDarkMode ? "outline-light" : "light"}>
                Close
              </Button>
            </Col>
          ) : (
            <></>
          )}
        </Row>
        <Button onClick={this.props.cancel} variant={this.props.isDarkMode ? "outline-light" : "light"}>
          Cancel
        </Button>
        &nbsp;&nbsp;
        {this.props.isEdit ? (
          <Button type="submit" variant="secondary" onClick={this.handleFormSubmit}>
            Update
          </Button>
        ) : (
          <Button type="submit" variant="secondary" onClick={this.handleFormSubmit}>
            Save
          </Button>
        )}
        &nbsp;&nbsp;
        {this.state.isIncomplete ? (
          <i style={{ color: "#f00" }}>
            &nbsp; There must be at least one item in the list and/or a bucket name must be filled.{" "}
          </i>
        ) : (
          <></>
        )}
        {this.state.isSaved ? <i style={{ color: "#00a700" }}>&nbsp; Settings saved. </i> : <></>}
        <div className="div-seperator" />
      </Form>
    );
  }
}
