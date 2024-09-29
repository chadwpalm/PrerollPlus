import React, { Component } from "react";
import Sequence from "../Sequence/Sequence";
import AddIcon from "../../images/add-icon.png";
import CreateSeq from "../CreateSeq/CreateSeq";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import "./Sequences.css";

export default class Sequences extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sequences: this.props.settings.sequences,
      isCreating: false,
      id: "-1",
      isEdit: false,
      show: false,
      tempID: "",
    };
  }

  handleAddSequence = () => {
    this.setState({
      isCreating: true,
      isEdit: false,
      id: "-1",
    });
  };

  handleEditSequence = (e) => {
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

    const index = settings.sequences.findIndex(({ id }) => id === this.state.tempID);

    settings.sequences.splice(index, 1);

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ show: false });

          var xhr2 = new XMLHttpRequest();
          xhr2.addEventListener("readystatechange", () => {
            if (xhr2.readyState === 4) {
              if (xhr2.status === 200) {
              } else {
                this.setState({
                  error: xhr2.responseText,
                });
              }
            }
          });

          xhr2.open("GET", "/webhook", true);
          xhr2.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          xhr2.send();
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
          <h3>Sequences</h3>
        </Row>
        <Row xs={2} sm="auto">
          {this.state.sequences?.map((sequence) => (
            <Col key={sequence.id}>
              <Sequence
                settings={this.props.settings}
                sequence={sequence.name}
                schedule={sequence.schedule}
                startMonth={sequence.startMonth}
                startDay={sequence.startDay}
                endMonth={sequence.endMonth}
                endDay={sequence.endDay}
                id={sequence.id}
                stateId={this.state.id}
                click={this.handleEditSequence}
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
                onClick={this.handleAddSequence}
              >
                <Card.Body className="d-flex align-items-center justify-content-center ">
                  <Image src={AddIcon} alt="Add" width="100" height="100" className="plus-image" />
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Row className="row-custom">
          {this.state.isCreating ? (
            <CreateSeq
              settings={this.props.settings}
              cancel={this.handleCancelCreate}
              saved={this.handleSaveCreate}
              id={this.state.id}
              isEdit={this.state.isEdit}
              isDarkMode={this.props.isDarkMode}
            />
          ) : (
            <h6>Click the plus to add a new Sequence.</h6>
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
