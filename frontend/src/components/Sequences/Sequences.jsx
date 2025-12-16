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
import SortName from "bootstrap-icons/icons/sort-alpha-up.svg";
import SortPriority from "bootstrap-icons/icons/sort-numeric-up.svg";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import "./Sequences.css";

export default class Sequences extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // sequences: this.props.settings.sequences,
      isCreating: false,
      id: "-1",
      isEdit: false,
      show: false,
      tempID: "",
    };
  }

  refreshSettings = () => {
    this.props.onSettingsChanged?.(); // calls refreshConfig() in App.jsx
  };

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
    this.setState({ tempID: e, show: true, fullscreen: "md-down" });
  };

  handleSortOrder = (order) => {
    const settings = { ...this.props.settings };
    let sequences = [...settings.sequences]; // Always work on a copy

    if (order === "1") {
      sequences.sort((a, b) => a.priority - b.priority);
    }

    if (order === "2") {
      sequences.sort((a, b) => a.name.localeCompare(b.name));
    }

    settings.sequences = sequences;

    // Save to backend
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.refreshSettings();
        } else {
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });
    xhr.open("POST", "/backend/save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));

    // Instant UI update
    this.props.updateSettings(settings);
    this.handleSaveCreate();
  };

  sortHolidayList = (list, order) => {
    if (!list) return [];
    if (order === "1") {
      return [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    if (order === "2") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
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
                this.refreshSettings();
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

    this.props.updateSettings(settings);
    this.handleSaveCreate();
  };

  render() {
    return (
      <>
        <Row>
          <h3>Sequences</h3>
        </Row>
        <Row className="mb-4">
          <div className="sort-buttons-group">
            <OverlayTrigger
              placement="top" // or "bottom", "left", etc. – "top" works well here
              overlay={<Tooltip id="tooltip-name">Sort by Name</Tooltip>}
            >
              <Button
                onClick={() => this.handleSortOrder("2")}
                variant={this.props.isDarkMode ? "outline-light" : "light"}
                className="sort-button"
              >
                <Image src={SortName} alt="Sort Name" className="arrow-icon" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-priority">Sort by Priority</Tooltip>}>
              <Button
                onClick={() => this.handleSortOrder("1")}
                variant={this.props.isDarkMode ? "outline-light" : "light"}
                className="sort-button"
              >
                <Image src={SortPriority} alt="Sort Priority" className="arrow-icon" />
              </Button>
            </OverlayTrigger>
          </div>
        </Row>
        <Row xs={2} sm="auto">
          {this.props.settings.sequences?.map((sequence) => (
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
                holiday={sequence.holiday}
                priority={sequence.priority}
                currentSeq={this.props.settings.currentSeq}
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
              onSettingsSaved={this.refreshSettings}
            />
          ) : (
            <>
              <p className="mb-3" style={{ fontSize: "12px" }}>
                Blue Border: Current Sequence  Red Border: Currently Editing Sequence
              </p>
              <h6 className="mb-0">Click the plus to add a new Sequence.</h6>
            </>
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
