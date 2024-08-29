import React, { Component } from "react";
import Bucket from "../Bucket/Bucket";
import AddIcon from "../../images/add-icon.png";
import Create from "../Create/Create";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

export default class Buckets extends Component {
  constructor(props) {
    super(props);
    this.state = {
      buckets: [],
      isCreating: false,
      id: "",
      isEdit: false,
      show: false,
      tempID: "",
    };
    this.state.buckets = this.props.settings.buckets;
  }

  handleAddBucket = () => {
    this.setState({
      isCreating: true,
      isEdit: false,
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

  handleDelete = (e) => {
    e.preventDefault();

    var settings = { ...this.props.settings };

    console.log("Here: ", this.state.tempID);

    const index = settings.buckets.findIndex(({ id }) => id === this.state.tempID);

    settings.buckets.splice(index, 1);

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ show: false });
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
            <Col>
              <Bucket
                settings={this.props.settings}
                bucket={bucket.name}
                media={bucket.media}
                id={bucket.id}
                click={this.handleEditBucket}
                saved={this.handleSaveCreate}
                isEdit={this.state.isEdit}
                isCreating={this.state.isCreating}
                delete={this.handleOpen}
              />
              <br />
            </Col>
          ))}

          <Col>
            {this.state.isEdit || this.state.isCreating ? (
              <Card style={{ width: "10rem", height: "8rem", backgroundColor: "#f8f9fa" }}>
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <img src={AddIcon} width="100" height="100" />
                </Card.Body>
              </Card>
            ) : (
              <Card
                style={{ width: "10rem", height: "8rem", backgroundColor: "#f8f9fa", cursor: "pointer" }}
                onClick={this.handleAddBucket}
              >
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <img src={AddIcon} width="100" height="100" />
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Row style={{ paddingLeft: "10px", paddingTop: "20px" }}>
          {this.state.isCreating ? (
            <Create
              settings={this.props.settings}
              cancel={this.handleCancelCreate}
              saved={this.handleSaveCreate}
              id={this.state.id}
              isEdit={this.state.isEdit}
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
        >
          <Modal.Body>
            <h4> Are you sure?</h4>
            <Button onClick={this.handleDelete}>Yes</Button>&nbsp;&nbsp;&nbsp;
            <Button variant="" onClick={this.handleClose}>
              Cancel
            </Button>
          </Modal.Body>
        </Modal>
      </>
    );
  }
}
