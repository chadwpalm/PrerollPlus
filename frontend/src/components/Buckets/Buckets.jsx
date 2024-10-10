import React, { Component } from "react";
import Bucket from "../Bucket/Bucket";
import AddIcon from "../../images/add-icon.png";
import Create from "../Create/Create";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import "../Sequences/Sequences.css";

export default class Buckets extends Component {
  constructor(props) {
    super(props);
    this.state = {
      buckets: this.props.settings.buckets,
      isCreating: false,
      id: "-1",
      isEdit: false,
      show: false,
      tempID: "",
    };
  }

  handleAddBucket = () => {
    this.setState({
      isCreating: true,
      isEdit: false,
      id: "-1",
    });
  };

  handleEditBucket = (e) => {
    this.setState({
      isCreating: true,
      isEdit: true,
      id: e,
    });
  };

  handleCancelCreate = () => {
    this.setState({ isCreating: false, isEdit: false });
  };

  handleSaveCreate = () => {
    this.setState({ isCreating: false, isEdit: false });
  };

  handleClose = () => this.setState({ show: false });

  handleOpen = (e) => {
    this.setState({ tempID: e });
    this.setState({ show: true, fullscreen: "md-down" });
  };

  handleDelete = () => {
    var settings = { ...this.props.settings };

    const index = settings.buckets.findIndex(({ id }) => id === this.state.tempID);

    settings.buckets.splice(index, 1);

    settings.sequences = settings.sequences.map((sequence) => ({
      ...sequence,
      buckets: sequence.buckets.filter((bucketId) => bucketId.id !== this.state.tempID),
    }));

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", async () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ show: false });

          const response = await fetch("/webhook", { method: "GET" });
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }
        } else {
          // error
          this.setState({
            show: false,
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));

    this.props.updateSettings(settings);
    this.handleSaveCreate();
  };

  render() {
    return (
      <>
        <Row>
          <h3>Buckets</h3>
        </Row>
        <Row xs={2} sm="auto">
          {this.state.buckets?.map((bucket) => (
            <Col key={bucket.id}>
              <Bucket
                settings={this.props.settings}
                bucket={bucket.name}
                media={bucket.media}
                id={bucket.id}
                stateId={this.state.id}
                click={this.handleEditBucket}
                saved={this.handleSaveCreate}
                isEdit={this.state.isEdit}
                isCreating={this.state.isCreating}
                delete={this.handleOpen}
                isDarkMode={this.props.isDarkMode}
              />
              <br />
            </Col>
          ))}

          <Col>
            {this.state.isEdit || this.state.isCreating ? (
              <Card
                className={`card-global ${this.state.id === "-1" ? "card-error" : "card-default"} ${
                  this.props.isDarkMode ? "dark-mode" : ""
                }`}
              >
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <img src={AddIcon} alt="Add" width="100" height="100" className="plus-image" />
                </Card.Body>
              </Card>
            ) : (
              <Card
                className={`card-global card-unselected ${this.props.isDarkMode ? "dark-mode" : ""}`}
                onClick={this.handleAddBucket}
              >
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <img src={AddIcon} alt="Add" width="100" height="100" className="plus-image" />
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Row className="row-custom">
          {this.state.isCreating ? (
            <Create
              settings={this.props.settings}
              cancel={this.handleCancelCreate}
              saved={this.handleSaveCreate}
              id={this.state.id}
              isEdit={this.state.isEdit}
              isDarkMode={this.props.isDarkMode}
              sockConnected={this.props.sockConnected}
              cannotConnect={this.props.cannotConnect}
            />
          ) : (
            <h6>Click the plus to add a new Bucket.</h6>
          )}
        </Row>
        <Modal
          show={this.state.show}
          fullscreen={this.state.fullscreen}
          onHide={this.handleClose}
          size="sm"
          backdrop="static"
          className={this.props.isDarkMode ? "dark-mode" : ""}
        >
          <Modal.Body>
            <h4> Are you sure?</h4>
            <Button variant={this.props.isDarkMode ? "secondary" : "primary"} onClick={this.handleDelete}>
              Yes
            </Button>
            &nbsp;&nbsp;&nbsp;
            <Button variant={this.props.isDarkMode ? "outline-light" : ""} onClick={this.handleClose}>
              Cancel
            </Button>
          </Modal.Body>
        </Modal>
      </>
    );
  }
}
