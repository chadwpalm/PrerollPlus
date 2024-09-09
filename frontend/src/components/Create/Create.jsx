import React, { Component, createRef } from "react";
import { v4 as uuid } from "uuid";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";

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
        currentDir: this.props.settings.settings.loc,
        dirTree: [],
        isError: false,
        isSaved: false,
        isIncomplete: false,
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
      };
    }

    this.handleFormSubmit = this.handleFormSubmit.bind(this);
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
            const updatedDirTree = [...prevState.dirTree, this.state.root];
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
    xhr.send(JSON.stringify({ dir: `${this.state.root}` }));
  }

  handleClickFiles = (e) => {
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

  handleAdd = () => {
    const newDir = "/" + this.state.dirTree.slice(1).join("/");
    const newMediaList = this.state.selectedList.map((element) => ({ file: element, dir: newDir }));
    this.setState((prevState) => ({
      media: [...prevState.media, ...newMediaList],
    }));
  };

  handleRemove = () => {
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
    this.state.directoryList.map((element) => {
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

    if (this.state.name === "" || this.state.media.length === 0) {
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

    if (this.props.isEdit) {
      const index = settings.buckets.findIndex(({ id }) => id === this.state.id);
      settings.buckets.splice(index, 1, temp);
    } else {
      settings.buckets.push(temp);
    }

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ isSaved: true });
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

  render() {
    return (
      <div>
        <Form.Label for="name">Name of bucket &nbsp;&nbsp;</Form.Label>
        <Form.Control value={this.state.name} id="name" name="name" onChange={this.handleName} size="sm" />
        <div style={{ paddingBottom: "0.75rem" }} />
        <Row xs={1} sm="auto">
          <Col>
            <Button onClick={this.handleRemove} type="submit" variant="light">
              Remove
            </Button>
            <div style={{ paddingBottom: "0.75rem" }} />
            {/* File Listing */}
            <div style={{ fontSize: "12px" }}>
              <Card style={{ width: "22rem", backgroundColor: "#ffffff", borderRadius: "0" }}>
                <Card.Title className="m-0 p-2">
                  <ListGroup.Item style={{ fontSize: "14px" }} variant="light">
                    Files in bucket
                  </ListGroup.Item>
                </Card.Title>
                <Card.Body className="m-0 p-0" style={{ height: "500px", overflowY: "auto", margin: false }}>
                  <ListGroup variant="flush">
                    {this.state.media.length === 0 ? (
                      <ListGroup.Item>&lt;Add Files Here&gt;</ListGroup.Item>
                    ) : (
                      Object.entries(
                        this.state.media.reduce((acc, item) => {
                          acc[item.file] = (acc[item.file] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([file, count]) => {
                        const percentage = ((count / this.state.media.length) * 100).toFixed(1);
                        return this.state.selectedFileList.includes(file) ? (
                          <ListGroup.Item
                            key={file}
                            value={JSON.stringify(file)}
                            action
                            active
                            onClick={this.handleClickFiles}
                            className="d-flex justify-content-between"
                          >
                            <span>
                              {file} {count > 1 ? `(${count})` : <></>}
                            </span>
                            <Badge bg="primary">{percentage}%</Badge>
                          </ListGroup.Item>
                        ) : (
                          <ListGroup.Item
                            key={file}
                            value={JSON.stringify(file)}
                            action
                            onClick={this.handleClickFiles}
                            className="d-flex justify-content-between"
                          >
                            <span>
                              {file} {count > 1 ? `(${count})` : <></>}
                            </span>
                            <Badge bg="primary">{percentage}%</Badge>
                          </ListGroup.Item>
                        );
                      })
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
            <div style={{ paddingBottom: "0.75rem" }} />
          </Col>
          <Col>
            <Button onClick={this.handleAdd} variant="light">
              Add
            </Button>
            &nbsp;&nbsp;
            <Button onClick={this.handleSelectAll} variant="light">
              Select All
            </Button>
            &nbsp;&nbsp;
            <Button onClick={this.handleSelectNone} variant="light">
              Select None
            </Button>
            <div style={{ paddingBottom: "0.75rem" }} />
            {/* Directory Listing */}
            <div style={{ fontSize: "12px" }}>
              <Card style={{ width: "22rem", backgroundColor: "#ffffff", borderRadius: "0" }}>
                <Card.Title className="m-0 p-2">
                  <ListGroup.Item style={{ fontSize: "14px" }} variant="light">
                    {this.state.currentDir}
                  </ListGroup.Item>
                </Card.Title>
                <Card.Body className="m-0 p-0" style={{ height: "500px", overflowY: "auto", margin: false }}>
                  <ListGroup variant="flush">
                    {this.state.currentDir !== `${this.state.root}` ? (
                      <ListGroup.Item
                        value={JSON.stringify({ name: "..", isDir: true })}
                        action
                        onClick={this.handleClick}
                      >
                        ../
                      </ListGroup.Item>
                    ) : null}
                    {this.state.directoryList.map((file) =>
                      file.isDir ? (
                        <ListGroup.Item key={file.name} value={JSON.stringify(file)} action onClick={this.handleClick}>
                          {file.name}/
                        </ListGroup.Item>
                      ) : this.state.selectedList.includes(file.name) ? (
                        <ListGroup.Item
                          key={file.name}
                          value={JSON.stringify(file)}
                          action
                          active
                          onClick={this.handleClick}
                        >
                          {file.name}
                        </ListGroup.Item>
                      ) : (
                        <ListGroup.Item key={file.name} value={JSON.stringify(file)} action onClick={this.handleClick}>
                          {file.name}
                        </ListGroup.Item>
                      )
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
            <div style={{ paddingBottom: "0.75rem" }} />
          </Col>
        </Row>
        <Button onClick={this.props.cancel} variant="light">
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
            &nbsp; There must be at least one item in the list and a bucket name must be filled.{" "}
          </i>
        ) : (
          <></>
        )}
        {this.state.isSaved ? <i style={{ color: "#00a700" }}>&nbsp; Settings saved. </i> : <></>}
        <div style={{ paddingBottom: "0.75rem" }} />
      </div>
    );
  }
}
