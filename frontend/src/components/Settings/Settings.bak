import React, { Component } from "react";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import Button from "react-bootstrap/Button";
import Stack from "react-bootstrap/Stack";

export default class Settings extends Component {
  constructor(props) {
    super(props);
    if (this.props.settings.settings) {
      this.state = {
        transition: this.props.settings.settings.transition ?? "0",
        startHour: this.props.settings.settings.startHour ?? "1",
        startMin: this.props.settings.settings.startMin ?? "0",
        startMed: this.props.settings.settings.startMed ?? "1",
        endHour: this.props.settings.settings.endHour ?? "1",
        endMin: this.props.settings.settings.endMin ?? "0",
        endMed: this.props.settings.settings.startMed ?? "1",
        latitude: this.props.settings.settings.latitude ?? "",
        longitude: this.props.settings.settings.longitude ?? "",
        isLoading: true,
        isError: false,
        errorRes: "",
        isEdit: true,
      };
    } else {
      this.state = {
        transition: "0",
        startHour: "1",
        startMin: "0",
        startMed: "1",
        endHour: "1",
        endMin: "0",
        endMed: "1",
        latitude: "",
        longitude: "",
        isLoading: true,
        errorRes: "",
        isEdit: false,
      };
    }
  }

  handleFormSubmit = (e) => {
    e.preventDefault();

    if (!this.props.settings.settings) this.props.settings.settings = {};

    this.props.settings.settings.transition = this.state.transition;
    this.props.settings.settings.startHour = this.state.startHour;
    this.props.settings.settings.startMin = this.state.startMin;
    this.props.settings.settings.startMed = this.state.startMed;
    this.props.settings.settings.endHour = this.state.endHour;
    this.props.settings.settings.endMin = this.state.endMin;
    this.props.settings.settings.endMed = this.state.endMed;
    this.props.settings.settings.latitude = this.state.latitude;
    this.props.settings.settings.longitude = this.state.longitude;

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
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
    xhr.send(JSON.stringify(this.props.settings));

    this.setState({ isEdit: true });
  };

  handleTransition = (e) => {
    this.setState({
      transition: e.target.value.toString(),
    });
  };

  handleTime = (e) => {
    switch (e.target.name) {
      case "startHour":
        this.setState({ startHour: e.target.value.toString() });
        break;
      case "startMin":
        this.setState({ startMin: e.target.value.toString() });
        break;
      case "startMed":
        this.setState({ startMed: e.target.value.toString() });
        break;
      case "endHour":
        this.setState({ endHour: e.target.value.toString() });
        break;
      case "endMin":
        this.setState({ endMin: e.target.value.toString() });
        break;
      case "endMed":
        this.setState({ endMed: e.target.value.toString() });
        break;
    }
  };

  handleLatitude = (e) => {
    this.setState({ latitude: e.target.value.toString() });
  };

  handleLongitude = (e) => {
    this.setState({ longitude: e.target.value.toString() });
  };

  render() {
    const options = [];
    for (var i = 0; i < 60; i++) {
      options.push(
        <option value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>
      );
    }
    return (
      <>
        <Row>
          <h3>Settings</h3>
        </Row>
        <div style={{ paddingBottom: "0.75rem" }} />
        <Row>
          <Form onSubmit={this.handleFormSubmit}>
            <h5>
              Global Settings &nbsp;&nbsp;
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>These settings will be applied toward profile settings that are set as "global".</Tooltip>
                }
              >
                <img src={Info} />
              </OverlayTrigger>
            </h5>
            <div style={{ paddingBottom: "0.75rem" }} />
            <Form.Label for="transition">
              Scene Transition Time (s) &nbsp;&nbsp;
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>
                    {" "}
                    This is the time in seconds for the scene to transition.
                    <br />
                    <br />
                    If set to "Default", Lumunarr will use the transition time that is saved in the scene (through a
                    third-party app). If there is no saved transition time, the Hue default of 0.4 seconds will be used.
                    <br />
                    <br />
                    Setting a specific time will override the transition time saved in the scene and use the selected
                    time instead.
                  </Tooltip>
                }
              >
                <img src={Info} alt="Info" />
              </OverlayTrigger>
            </Form.Label>
            <Stack gap={1} direction="horizontal">
              <Form.Range
                id="transition"
                className="me-auto"
                value={this.state.transition}
                min={0}
                max={10}
                step={0.2}
                onChange={this.handleTransition}
              />
              {this.state.transition === "0" ? (
                <>
                  <div style={{ width: 80, textAlign: "right" }}>Default</div>
                </>
              ) : (
                <>
                  <div style={{ width: 80, textAlign: "right" }}>{this.state.transition} s</div>
                </>
              )}
            </Stack>
            <div style={{ paddingBottom: "0.75rem" }} />
            {/* Schedule */}
            <Form.Label for="schedule">
              Schedule &nbsp;&nbsp;
              <OverlayTrigger
                placement="right"
                overlay={<Tooltip>Add a global schedule for when the triggers will be active.</Tooltip>}
              >
                <img src={Info} alt="Schedule" />
              </OverlayTrigger>
            </Form.Label>
            <div style={{ paddingBottom: "0.75rem" }} />
            <Stack gap={1} direction="horizontal">
              Start:&nbsp;&nbsp;
              <Form.Select
                value={this.state.startHour}
                id="startHour"
                name="startHour"
                onChange={this.handleTime}
                size="sm"
                style={{ width: "65px" }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
              </Form.Select>
              <Form.Select
                value={this.state.startMin}
                id="startMin"
                name="startMin"
                onChange={this.handleTime}
                size="sm"
                style={{ width: "65px" }}
              >
                {options}
              </Form.Select>
              <Form.Select
                value={this.state.startMed}
                id="startMed"
                name="startMed"
                onChange={this.handleTime}
                size="sm"
                style={{ width: "68px" }}
              >
                <option value="1">AM</option>
                <option value="2">PM</option>
              </Form.Select>
            </Stack>
            <div style={{ paddingBottom: "0.50rem" }} />
            <Stack gap={1} direction="horizontal">
              End:&nbsp;&nbsp;&nbsp;&nbsp;
              <Form.Select
                value={this.state.endHour}
                id="endHour"
                name="endHour"
                onChange={this.handleTime}
                size="sm"
                style={{ width: "65px" }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
              </Form.Select>
              <Form.Select
                value={this.state.endMin}
                id="endMin"
                name="endMin"
                onChange={this.handleTime}
                size="sm"
                style={{ width: "65px" }}
              >
                {options}
              </Form.Select>
              <Form.Select
                value={this.state.endMed}
                id="endMed"
                name="endMed"
                onChange={this.handleTime}
                size="sm"
                style={{ width: "68px" }}
              >
                <option value="1">AM</option>
                <option value="2">PM</option>
              </Form.Select>
            </Stack>
            <div style={{ paddingBottom: "1.5rem" }} />
            {/* Location */}
            <h5>
              Geographical Location &nbsp;&nbsp;
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>
                    Enter your location in latitude and longitude. This is required to use sunrise/sunset schedule.
                  </Tooltip>
                }
              >
                <img src={Info} alt="Location" />
              </OverlayTrigger>
            </h5>
            <div style={{ paddingBottom: "0.75rem" }} />
            1. Visit{" "}
            <a href="https://www.latlong.net/" target="_blank">
              LatLong.net
            </a>
            <br />
            2. Pinpoint your location using the text box and/or map
            <br />
            3. Copy and paste the latitude and longitude into the fields below
            <br />
            <br />
            <Form.Label for="latitude">Latitude</Form.Label>
            <Form.Control
              value={this.state.latitude}
              id="latitude"
              name="latitude"
              onChange={this.handleLatitude}
              size="sm"
            />
            <div style={{ paddingBottom: "0.75rem" }} />
            <Form.Label for="longitude">Longitude</Form.Label>
            <Form.Control
              value={this.state.longitude}
              id="longitude"
              name="longitude"
              onChange={this.handleLongitude}
              size="sm"
            />
            <div style={{ paddingBottom: "0.75rem" }} />
            {/* Cancel/Save */}
            {this.state.isEdit ? (
              <Button type="submit" variant="secondary">
                Update
              </Button>
            ) : (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
            <div style={{ paddingBottom: "1rem" }} />
          </Form>
        </Row>
      </>
    );
  }
}
