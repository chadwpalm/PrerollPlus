import React, { Component } from "react";
import Sequence from "../Sequence/Sequence";
import AddIcon from "../../images/add-icon.png";
import CreateSeq from "../CreateSeq/CreateSeq";
import Form from "react-bootstrap/Form";
import Stack from "react-bootstrap/Stack";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import SortName from "bootstrap-icons/icons/sort-alpha-up.svg";
import SortPriority from "bootstrap-icons/icons/sort-numeric-up.svg";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { api } from "../../api";
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
      showOverride: false,
      tempID: "",
      tempIDOverride: "",
      tempNameOverride: "",
      overrideLength: "1",
      days: 0,
      hours: 0,
      minutes: 0,
      endTimestamp: 0,
      isIncomplete: false,
      isStale: false,
      editingExistingOverride: false,
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

  handleCloseOverride = () => this.setState({ showOverride: false });

  handleOpen = (e) => {
    this.setState({ tempID: e, show: true, fullscreen: "md-down" });
  };

  handleOpenOverride = (e) => {
    const initialEnd = this.calculateEndTimestamp({ days: 0, hours: 0, minutes: 0 });

    const currentOverride = this.props.settings.currentOverride || { id: null, endTimestamp: null };

    const isCurrentlyOverridden = currentOverride.id === e[0];

    this.setState({
      tempIDOverride: e[0],
      tempNameOverride: e[1],
      showOverride: true,
      fullscreen: "md-down",
      overrideLength: "2",
      days: 0,
      hours: 0,
      minutes: 0,
      endTimestamp: initialEnd,
      editingExistingOverride: isCurrentlyOverridden,
    });
  };

  // Save, close the dialog (modal = "show" or "showOverride"), then send Plex new prerolls and reload settings
  saveAndUpdate = (settings, modal) => {
    api
      .saveSettings(settings)
      .then(() => {
        this.setState({ [modal]: false });
        return api.updatePrerolls().then(this.refreshSettings);
      })
      .catch((err) => this.setState({ [modal]: false, error: err.body || err.message }));
  };

  handleClearOverride = (e) => {
    const settings = { ...this.props.settings };

    settings.currentOverride = {
      id: null,
      endTimestamp: null,
    };

    this.saveAndUpdate(settings, "showOverride");

    this.props.updateSettings(settings);
  };

  handleLength = (e) => {
    this.setState({
      overrideLength: e.target.value,
      endTimestamp:
        e.target.value === "1"
          ? null
          : this.calculateEndTimestamp(this.state.days, this.state.hours, this.state.minutes),
      isIncomplete: false,
      isStale: false,
    });
  };

  handleDays = (e) => {
    const newDays = e.target.value;

    this.setState((prevState) => {
      const newEndTimestamp = this.calculateEndTimestamp({
        days: newDays,
        hours: prevState.hours,
        minutes: prevState.minutes,
      });

      return {
        days: newDays,
        endTimestamp: newEndTimestamp,
        isIncomplete: false,
        isStale: false,
      };
    });
  };

  handleHours = (e) => {
    const newHours = e.target.value;

    this.setState((prevState) => {
      const newEndTimestamp = this.calculateEndTimestamp({
        days: prevState.days,
        hours: newHours,
        minutes: prevState.minutes,
      });

      return {
        hours: newHours,
        endTimestamp: newEndTimestamp,
        isIncomplete: false,
        isStale: false,
      };
    });
  };

  handleMinutes = (e) => {
    const newMinutes = e.target.value;

    this.setState((prevState) => {
      const newEndTimestamp = this.calculateEndTimestamp({
        days: prevState.days,
        hours: prevState.hours,
        minutes: newMinutes,
      });

      return {
        minutes: newMinutes,
        endTimestamp: newEndTimestamp,
        isIncomplete: false,
        isStale: false,
      };
    });
  };

  calculateEndTimestamp = ({ days = 0, hours = 0, minutes = 0 }) => {
    const end = new Date();

    const d = parseInt(days, 10) || 0;
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;

    if (d) end.setDate(end.getDate() + d);
    if (h) end.setHours(end.getHours() + h);
    if (m) end.setMinutes(end.getMinutes() + m);

    return end.getTime();
  };

  handleSortOrder = (order) => {
    const settings = { ...this.props.settings };
    let sequences = [...settings.sequences];

    if (order === "1") {
      sequences.sort((a, b) => a.priority - b.priority);
    }

    if (order === "2") {
      sequences.sort((a, b) => a.name.localeCompare(b.name));
    }

    settings.sequences = sequences;

    api
      .saveSettings(settings)
      .then(this.refreshSettings)
      .catch((err) => this.setState({ error: err.body || err.message }));

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

    this.saveAndUpdate(settings, "show");

    this.props.updateSettings(settings);
    this.handleSaveCreate();
  };

  handleOverride = (e) => {
    e.preventDefault();

    if (
      parseInt(this.state.days, 10) === 0 &&
      parseInt(this.state.hours, 10) === 0 &&
      parseInt(this.state.minutes, 10) === 0 &&
      this.state.overrideLength === "2"
    ) {
      this.setState({ isIncomplete: true });
      return;
    }

    var currentTime = Date.now();
    if (this.state.endTimestamp && currentTime >= this.state.endTimestamp) {
      this.setState({ isStale: true });
      return;
    }

    var settings = { ...this.props.settings };
    const index = settings.sequences.findIndex(({ id }) => id === this.state.tempIDOverride);
    if (index === -1) {
      this.setState({
        showOverride: false,
        error: "Sequence not found",
      });
      return;
    }

    settings.currentOverride = {
      id: this.state.tempIDOverride,
      endTimestamp: this.state.endTimestamp,
    };

    this.saveAndUpdate(settings, "showOverride");

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
            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-name">Sort by Name</Tooltip>}>
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
        <div className="card-grid">
          {this.props.settings.sequences?.map((sequence) => (
            <div key={sequence.id}>
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
                days={sequence.days}
                override={this.handleOpenOverride}
                currentOvr={this.props.settings.currentOverride?.id ?? null}
                endTimestamp={this.props.settings.currentOverride?.endTimestamp ?? null}
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
                onClick={this.handleAddSequence}
              >
                <Card.Body className="d-flex align-items-center justify-content-center ">
                  <Image src={AddIcon} alt="Add" width="100" height="100" className="plus-image" />
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
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
              <div className="card-legend mb-3">
                <span>
                  <span className="legend-swatch legend-current" /> Current Sequence
                </span>
                <span>
                  <span className="legend-swatch legend-editing" /> Currently Editing
                </span>
                <span>
                  <span className="legend-swatch legend-override" /> Overridden (click a name to override)
                </span>
              </div>
              <h6 className="mb-0">Click the plus to add a new Sequence.</h6>
            </>
          )}
        </Row>
        <Modal
          show={this.state.show}
          fullscreen={false}
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
        <Modal
          show={this.state.showOverride}
          fullscreen={false}
          onHide={this.handleOverride}
          size="lg"
          backdrop="static"
          className={this.props.isDarkMode ? "dark-mode" : ""}
        >
          <Modal.Header>
            <Modal.Title>Override</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form className={`form-content ${this.props.isDarkMode ? "dark-mode" : ""}`}>
              <div className="mb-3">
                <Form.Label>Sequence: &nbsp;{this.state.tempNameOverride}</Form.Label>
              </div>
              <div className="mb-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Indefinitely"
                  value="1"
                  id="Length"
                  name="Length"
                  onChange={this.handleLength}
                  size="sm"
                  checked={this.state.overrideLength === "1"}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Duration"
                  value="2"
                  id="Length"
                  name="Length"
                  onChange={this.handleLength}
                  size="sm"
                  checked={this.state.overrideLength === "2"}
                />
              </div>
              <Stack gap={3} direction="horizontal" className="mb-3">
                Days
                <Form.Control
                  type="number"
                  min={0}
                  max={365}
                  defaultValue={this.state.days}
                  style={{ width: "80px" }}
                  onChange={this.handleDays}
                  disabled={this.state.overrideLength === "1"}
                />
                Hours
                <Form.Control
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={this.state.hours}
                  style={{ width: "70px" }}
                  onChange={this.handleHours}
                  disabled={this.state.overrideLength === "1"}
                />
                Minutes
                <Form.Control
                  type="number"
                  min={0}
                  max={59}
                  defaultValue={this.state.minutes}
                  style={{ width: "70px" }}
                  onChange={this.handleMinutes}
                  disabled={this.state.overrideLength === "1"}
                />
              </Stack>
              Ends: {this.state.endTimestamp ? new Date(this.state.endTimestamp).toLocaleString() : "N/A"}
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="d-flex gap-2">
                  <Button variant={this.props.isDarkMode ? "secondary" : "primary"} onClick={this.handleOverride}>
                    Save
                  </Button>
                  <Button
                    variant={this.props.isDarkMode ? "outline-light" : "secondary"}
                    onClick={this.handleCloseOverride}
                  >
                    Cancel
                  </Button>
                </div>
                {this.state.editingExistingOverride && (
                  <Button variant={"danger"} onClick={this.handleClearOverride}>
                    Delete
                  </Button>
                )}
              </div>
            </Form>
          </Modal.Body>
        </Modal>
      </>
    );
  }
}
