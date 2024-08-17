import React, { Component } from "react";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import Button from "react-bootstrap/Button";
import Loading from "../../images/loading-gif.gif";
import Stack from "react-bootstrap/Stack";

export default class Server extends Component {
  constructor(props) {
    super(props);
    if (this.props.settings.server) {
      this.state = {
        roomPlay: this.props.settings.server.roomPlay,
        lightPlay: this.props.settings.server.lightPlay.toString(),
        behaviorPlay: this.props.settings.server.behaviorPlay.toString(),
        colorPlay: this.props.settings.server.colorPlay.toString(),
        brightnessPlay: this.props.settings.server.brightnessPlay.toString(),
        intervalsPlay: this.props.settings.server.intervalsPlay.toString(),
        lightNew: this.props.settings.server.lightNew.toString(),
        behaviorNew: this.props.settings.server.behaviorNew.toString(),
        colorNew: this.props.settings.server.colorNew.toString(),
        brightnessNew: this.props.settings.server.brightnessNew.toString(),
        intervalsNew: this.props.settings.server.intervalsNew.toString(),
        groupsList: [],
        lightList: [],
        roomLightListPlay: [],
        roomLightListNew: [],
        isLoading: true,
        selectIntervalsPlay: false,
        selectIntervalsNew: false,
        isError: false,
        isIncomplete: false,
        errorRes: "",
        isOffPlay: false,
        isOffNew: false,
        isEdit: true,
      };
    } else {
      this.state = {
        roomPlay: "-1",
        lightPlay: "-1",
        behaviorPlay: "-1",
        colorPlay: "-1",
        brightnessPlay: "5",
        intervalsPlay: "1",
        lightNew: "-1",
        behaviorNew: "-1",
        colorNew: "-1",
        brightnessNew: "5",
        intervalsNew: "1",
        groupsList: [],
        lightList: [],
        roomLightListPlay: [],
        roomLightListNew: [],
        isLoading: true,
        selectIntervalsPlay: false,
        selectIntervalsNew: false,
        isIncomplete: false,
        errorRes: "",
        isOffPlay: false,
        isOffNew: false,
        isEdit: false,
      };
    }
  }

  componentDidMount() {
    var settings = { ...this.props.settings };

    if (settings.server) {
      if (settings.server.lightPlay.toString() === "-2") {
        this.setState({ isOffPlay: true });
      }

      if (settings.server.lightNew.toString() === "-2") {
        this.setState({ isOffNew: true });
      }
    }

    var xhr = new XMLHttpRequest();
    xhr.timeout = 10000;
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // request successful
          var response = xhr.responseText,
            json = JSON.parse(response);
          this.setState({ lightList: json[0] });
          this.setState({ groupsList: json[1] });
          this.setState({ isLoading: false });

          if (this.props.settings.server) {
            if (this.state.lightPlay !== "-2") {
              var roomPlay = json[0].find(({ Id }) => Id === this.state.lightPlay).Room;
            } else {
              roomPlay = "-1";
            }
            if (this.state.lightNew !== "-2") {
              var roomNew = json[0].find(({ Id }) => Id === this.state.lightNew).Room;
            } else {
              roomNew = "-1";
            }
            if (this.state.roomPlay === undefined) this.setState({ roomPlay: roomPlay });
            if (this.state.roomNew === undefined) this.setState({ roomNew: roomNew });
          }
          var tempPlay = [];
          var tempNew = [];
          this.setState({ roomLightListPlay: [] });
          this.setState({ roomLightListNew: [] });
          json[0].forEach((light) => {
            if (this.state.roomPlay === undefined) {
              if (light.Room === roomPlay) tempPlay.push(light);
            } else {
              if (light.Room === this.state.roomPlay) tempPlay.push(light);
            }
          });
          json[0].forEach((light) => {
            if (this.state.roomNew === undefined) {
              if (light.Room === roomNew) tempNew.push(light);
            } else {
              if (light.Room === this.state.roomNew) tempNew.push(light);
            }
          });

          this.setState({ roomLightListPlay: tempPlay });
          this.setState({ roomLightListNew: tempNew });
        } else {
          // error
          this.setState({
            isLoaded: true,
            isError: true,
            errorRes: xhr.responseText,
          });
        }
      }
    });
    xhr.open("POST", "/backend/server", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));
  }

  handleFormSubmit = (e) => {
    e.preventDefault();

    if (!this.state.isOffPlay) {
      if (
        this.state.lightPlay === "-1" ||
        this.state.behaviorPlay === "-1" ||
        this.state.colorPlay === "-1" ||
        this.state.brightnessPlay === "-1" ||
        (this.state.intervalsPlay === "-1" && this.state.behaviorPlay === "2")
      ) {
        this.setState({ isIncomplete: true });
        return;
      }
    }

    if (!this.state.isOffNew) {
      if (
        this.state.lightNew === "-1" ||
        this.state.behaviorNew === "-1" ||
        this.state.colorNew === "-1" ||
        this.state.brightnessNew === "-1" ||
        (this.state.intervalsNew === "-1" && this.state.behaviorNew === "2")
      ) {
        this.setState({ isIncomplete: true });
        return;
      }
    }

    if (!this.props.settings.server) this.props.settings.server = {};

    this.props.settings.server.roomPlay = this.state.roomPlay;
    this.props.settings.server.roomNew = this.state.roomNew;
    this.props.settings.server.lightPlay = this.state.lightPlay;
    this.props.settings.server.behaviorPlay = this.state.behaviorPlay;
    this.props.settings.server.colorPlay = this.state.colorPlay;
    this.props.settings.server.brightnessPlay = this.state.brightnessPlay;
    this.props.settings.server.intervalsPlay = this.state.intervalsPlay;
    this.props.settings.server.lightNew = this.state.lightNew;
    this.props.settings.server.behaviorNew = this.state.behaviorNew;
    this.props.settings.server.colorNew = this.state.colorNew;
    this.props.settings.server.brightnessNew = this.state.brightnessNew;
    this.props.settings.server.intervalsNew = this.state.intervalsNew;

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

    this.setState({ isIncomplete: false, isEdit: true });
  };

  handleLightPlay = (e) => {
    this.setState({ lightPlay: e.target.value.toString() });
    if (e.target.value.toString() === "-2") {
      this.setState({ isOffPlay: true, roomPlay: "-1" });
    } else {
      this.setState({ isOffPlay: false });
    }
  };

  handleBehaviorPlay = (e) => {
    this.setState({ behaviorPlay: e.target.value.toString() });
  };

  handleIntervalsPlay = (e) => {
    this.setState({ intervalsPlay: e.target.value.toString() });
  };

  handleColorPlay = (e) => {
    this.setState({ colorPlay: e.target.value.toString() });
  };

  handleBrightnessPlay = (e) => {
    this.setState({ brightnessPlay: e.target.value.toString() });
  };

  handleRoomPlay = (e) => {
    this.setState({ roomPlay: e.target.value.toString() });
    var temp = [];
    this.setState({ roomLightListPlay: [] });
    this.state.lightList.forEach((light) => {
      if (light.Room === e.target.value.toString()) temp.push(light);
    });

    this.setState({ roomLightListPlay: temp });
  };

  handleRoomNew = (e) => {
    this.setState({ roomNew: e.target.value.toString() });
    var temp = [];
    this.setState({ roomLightListNew: [] });
    this.state.lightList.forEach((light) => {
      if (light.Room === e.target.value.toString()) temp.push(light);
    });

    this.setState({ roomLightListNew: temp });
  };

  handleLightNew = (e) => {
    this.setState({ lightNew: e.target.value.toString() });
    if (e.target.value.toString() === "-2") {
      this.setState({ isOffNew: true, roomNew: "-1" });
    } else {
      this.setState({ isOffNew: false });
    }
  };

  handleBehaviorNew = (e) => {
    this.setState({ behaviorNew: e.target.value.toString() });
  };

  handleIntervalsNew = (e) => {
    this.setState({ intervalsNew: e.target.value.toString() });
  };

  handleColorNew = (e) => {
    this.setState({ colorNew: e.target.value.toString() });
  };

  handleBrightnessNew = (e) => {
    this.setState({ brightnessNew: e.target.value.toString() });
  };

  render() {
    if (this.state.isError) {
      return <>{this.state.errorRes}</>;
    } else if (this.state.isLoading) {
      return (
        <div className="d-flex align-items-center justify-content-center">
          <img src={Loading} width="50" />
        </div>
      );
    } else {
      return (
        <>
          <Row>
            <h3>Server</h3>
          </Row>
          <div style={{ paddingBottom: "0.75rem" }} />
          <Row>
            <Form onSubmit={this.handleFormSubmit}>
              <h5>
                Playback Started &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      This lets a light be used to alert the server admin that someone has started watching a stream.
                    </Tooltip>
                  }
                >
                  <img src={Info} />
                </OverlayTrigger>
              </h5>
              <Form.Label for="roomPlay">
                Room &nbsp;&nbsp;
                <OverlayTrigger placement="right" overlay={<Tooltip>Select the room to be used.</Tooltip>}>
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.roomPlay}
                id="roomPlay"
                name="roomPlay"
                onChange={this.handleRoomPlay}
                size="sm"
              >
                <option value="-1">Select Room</option>
                {this.state.groupsList.map((group) => (
                  <option value={group.Room}>
                    {group.Room} ({group.Type})
                  </option>
                ))}
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              <Form.Label for="lightPlay">
                Light &nbsp;&nbsp;
                <OverlayTrigger placement="right" overlay={<Tooltip>Select the light to be used.</Tooltip>}>
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.lightPlay}
                id="lightPlay"
                name="lightPlay"
                onChange={this.handleLightPlay}
                size="sm"
              >
                <option value="-1">Select a Light</option>
                <option value="-2">None</option>
                {this.state.roomLightListPlay.map((light) => (
                  <option value={light.Id}>{light.Name}</option>
                ))}
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              <Form.Label for="behaviorPlay">
                Behavior &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      Select behavior for the light. This could be to turn the light on, or make it blink.
                      <br />
                      <br />
                      Turn On: If the light is already on, the "turn on" function will just change the color and
                      brightness.
                      <br />
                      Blink: Blink will go the set amount of intervals set and return to the state it was at before the
                      blinking.
                    </Tooltip>
                  }
                >
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.behaviorPlay}
                id="behaviorPlay"
                name="behaviorPlay"
                onChange={this.handleBehaviorPlay}
                size="sm"
                disabled={this.state.isOffPlay}
              >
                <option value="-1">Select Behavior</option>
                <option value="1">Turn On</option>
                <option value="2">Blink</option>
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              {this.state.behaviorPlay === "2" ? (
                <>
                  <Form.Label for="intervalsPlay">
                    Intervals &nbsp;&nbsp;
                    <OverlayTrigger
                      placement="right"
                      overlay={<Tooltip>Select number of times the light will blink.</Tooltip>}
                    >
                      <img src={Info} />
                    </OverlayTrigger>
                  </Form.Label>
                  <Stack gap={1} direction="horizontal">
                    <div style={{ width: 40, textAlign: "left" }}>{this.state.intervalsPlay}</div>
                    <Form.Range
                      id="intervalsPlay"
                      className="me-auto"
                      value={this.state.intervalsPlay}
                      min={1}
                      max={10}
                      step={1}
                      onChange={this.handleIntervalsPlay}
                      disabled={this.state.isOffPlay}
                    />
                  </Stack>
                  <div style={{ paddingBottom: "0.75rem" }} />
                </>
              ) : (
                <></>
              )}
              <Form.Label for="colorPlay">
                Color &nbsp;&nbsp;
                <OverlayTrigger placement="right" overlay={<Tooltip>Select color for the light.</Tooltip>}>
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.colorPlay}
                id="colorPlay"
                name="colorPlay"
                onChange={this.handleColorPlay}
                size="sm"
                disabled={this.state.isOffPlay}
              >
                <option value="-1">Select Color</option>
                <option value="0">Red</option>
                <option value="1">Orange</option>
                <option value="2">Yellow</option>
                <option value="3">Green</option>
                <option value="4">Blue</option>
                <option value="5">Purple</option>
                <option value="6">White</option>
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              <Form.Label for="brightnessPlay">
                Brightness &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={<Tooltip>Select brightness for the light. Use number from 5% to 100%.</Tooltip>}
                >
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Stack gap={1} direction="horizontal">
                <div style={{ width: 50, textAlign: "left" }}>{this.state.brightnessPlay}%</div>
                <Form.Range
                  id="brightnessPlay"
                  className="me-auto"
                  value={this.state.brightnessPlay}
                  min={5}
                  max={100}
                  step={5}
                  onChange={this.handleBrightnessPlay}
                  disabled={this.state.isOffPlay}
                />
              </Stack>
              <div style={{ paddingBottom: "1.5rem" }} />
              <h5>
                Library New &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      This lets a light be used to alert the server admin that new media has been added to the server.
                    </Tooltip>
                  }
                >
                  <img src={Info} />
                </OverlayTrigger>
              </h5>
              <Form.Label for="roomNew">
                Room &nbsp;&nbsp;
                <OverlayTrigger placement="right" overlay={<Tooltip>Select the room to be used.</Tooltip>}>
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.roomNew}
                id="roomNew"
                name="roomNew"
                onChange={this.handleRoomNew}
                size="sm"
              >
                <option value="-1">Select Room</option>
                {this.state.groupsList.map((group) => (
                  <option value={group.Room}>
                    {group.Room} ({group.Type})
                  </option>
                ))}
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              <Form.Label for="lightNew">
                Light &nbsp;&nbsp;
                <OverlayTrigger placement="right" overlay={<Tooltip>Select the light to be used.</Tooltip>}>
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.lightNew}
                id="lightNew"
                name="lightNew"
                onChange={this.handleLightNew}
                size="sm"
              >
                <option value="-1">Select a Light</option>
                <option value="-2">None</option>
                {this.state.roomLightListNew.map((light) => (
                  <option value={light.Id}>{light.Name}</option>
                ))}
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              <Form.Label for="behaviorNew">
                Behavior &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      Select behavior for the light. This could be to turn the light on, or make it blink.
                      <br />
                      <br />
                      Turn On: If the light is already on, the "turn on" function will just change the color and
                      brightness.
                      <br />
                      Blink: Blink will go the set amount of intervals set and return to the state it was at before the
                      blinking.
                    </Tooltip>
                  }
                >
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.behaviorNew}
                id="behaviorNew"
                name="behaviorNew"
                onChange={this.handleBehaviorNew}
                size="sm"
                disabled={this.state.isOffNew}
              >
                <option value="-1">Select Behavior</option>
                <option value="1">Turn On</option>
                <option value="2">Blink</option>
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              {this.state.behaviorNew === "2" ? (
                <>
                  <Form.Label for="intervalsNew">
                    Intervals &nbsp;&nbsp;
                    <OverlayTrigger
                      placement="right"
                      overlay={<Tooltip>Select number of times the light will blink.</Tooltip>}
                    >
                      <img src={Info} />
                    </OverlayTrigger>
                  </Form.Label>
                  <Stack gap={1} direction="horizontal">
                    <div style={{ width: 40, textAlign: "left" }}>{this.state.intervalsNew}</div>
                    <Form.Range
                      id="intervalsNew"
                      className="me-auto"
                      value={this.state.intervalsNew}
                      min={1}
                      max={10}
                      step={1}
                      onChange={this.handleIntervalsNew}
                    />
                  </Stack>
                  <div style={{ paddingBottom: "0.75rem" }} />
                </>
              ) : (
                <></>
              )}
              <Form.Label for="colorNew">
                Color &nbsp;&nbsp;
                <OverlayTrigger placement="right" overlay={<Tooltip>Select color for the light.</Tooltip>}>
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Form.Select
                value={this.state.colorNew}
                id="colorNew"
                name="colorNew"
                onChange={this.handleColorNew}
                size="sm"
                disabled={this.state.isOffNew}
              >
                <option value="-1">Select Color</option>
                <option value="0">Red</option>
                <option value="1">Orange</option>
                <option value="2">Yellow</option>
                <option value="3">Green</option>
                <option value="4">Blue</option>
                <option value="5">Purple</option>
                <option value="6">White</option>
              </Form.Select>
              <div style={{ paddingBottom: "0.75rem" }} />
              <Form.Label for="brightnessNew">
                Brightness &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={<Tooltip>Select brightness for the light. Use number from 5% to 100%.</Tooltip>}
                >
                  <img src={Info} />
                </OverlayTrigger>
              </Form.Label>
              <Stack gap={1} direction="horizontal">
                <div style={{ width: 50, textAlign: "left" }}>{this.state.brightnessNew}%</div>
                <Form.Range
                  id="brightnessNew"
                  className="me-auto"
                  value={this.state.brightnessNew}
                  min={5}
                  max={100}
                  step={5}
                  onChange={this.handleBrightnessNew}
                  disabled={this.state.isOffNew}
                />
              </Stack>
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
              {this.state.isIncomplete ? (
                <i style={{ color: "#f00" }}>&nbsp; All parameters must be selected </i>
              ) : (
                <></>
              )}
              <div style={{ paddingBottom: "1rem" }} />
            </Form>
          </Row>
        </>
      );
    }
  }
}
