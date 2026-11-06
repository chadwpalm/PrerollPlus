import React, { Component } from "react";
import Bucket from "../Bucket/Bucket";
import AddIcon from "../../images/add-icon.png";
import Create from "../Create/Create";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import SortName from "bootstrap-icons/icons/sort-alpha-up.svg";
import Image from "react-bootstrap/Image";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { api } from "../../api";
import "../Sequences/Sequences.css";

export default class Buckets extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // buckets: this.props.settings.buckets,
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
    this.props.saved();
    this.setState({ isCreating: false, isEdit: false });
  };

  handleClose = () => this.setState({ show: false });

  handleOpen = (e) => {
    this.setState({ tempID: e, show: true, fullscreen: "md-down" });
  };

  handleDelete = () => {
    var settings = { ...this.props.settings };

    const index = settings.buckets.findIndex(({ id }) => id === this.state.tempID);

    settings.buckets.splice(index, 1);

    settings.sequences = settings.sequences.map((sequence) => ({
      ...sequence,
      buckets: sequence.buckets.filter((bucketId) => bucketId.id !== this.state.tempID),
    }));

    api
      .saveSettings(settings)
      .then(() => {
        this.setState({ show: false });
        return api.updatePrerolls();
      })
      .catch((err) => this.setState({ show: false, error: err.body || err.message }));

    this.props.updateSettings(settings);
    this.handleSaveCreate();
  };

  handleSortOrder = () => {
    const settings = { ...this.props.settings };
    let buckets = [...settings.buckets]; // Always work on a copy

    buckets.sort((a, b) => a.name.localeCompare(b.name));

    settings.buckets = buckets;

    // Save to backend
    api
      .saveSettings(settings)
      .then(this.refreshSettings)
      .catch((err) => this.setState({ error: err.body || err.message }));

    // Instant UI update
    this.props.updateSettings(settings);
    this.handleSaveCreate();
  };

  render() {
    return (
      <>
        <Row>
          <h3>Buckets</h3>
        </Row>
        <Row className="mb-4">
          <div className="sort-buttons-group">
            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-name">Sort by Name</Tooltip>}>
              <Button
                onClick={() => this.handleSortOrder()}
                variant={this.props.isDarkMode ? "outline-light" : "light"}
                className="sort-button"
              >
                <Image src={SortName} alt="Sort Name" className="arrow-icon" />
              </Button>
            </OverlayTrigger>
          </div>
        </Row>
        <div className="card-grid">
          {this.props.settings.buckets?.map((bucket) => (
            <div key={bucket.id}>
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
            </div>
          ))}

          <div>
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
          </div>
        </div>
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
            <>
              <div className="card-legend mb-3">
                <span>
                  <b>Default</b>: added automatically to new sequences
                </span>
                <span>
                  <span className="legend-swatch legend-editing" /> Currently Editing
                </span>
              </div>
              <h6 className="mb-0">Click the plus to add a new Bucket.</h6>
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
