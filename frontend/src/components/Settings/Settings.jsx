import React, { Component } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import Repeat from "bootstrap-icons/icons/arrow-repeat.svg";
import Button from "react-bootstrap/Button";
import Stack from "react-bootstrap/Stack";
import Image from "react-bootstrap/Image";
import "./Settings.css";

export default class Settings extends Component {
  constructor(props) {
    super(props);
    if (this.props.settings.settings) {
      this.state = {
        ip: this.props.settings.settings.ip,
        port: this.props.settings.settings.port,
        ssl: this.props.settings.settings.ssl,
        loc: this.props.settings.settings.loc ?? "/prerolls",
        plexLoc: this.props.settings.settings.plexLoc,
        servers: [],
        isGetting: false,
        isLoaded: false,
        isError: false,
        isIncomplete: false,
        isSaved: false,
        polling: this.props.settings.settings.polling ?? "1",
        advanced: this.props.settings.advanced ?? false,
        logLevel: this.props.settings.settings.logLevel ?? "0",
      };
    } else {
      this.state = {
        ip: "",
        port: "",
        ssl: false,
        loc: "/prerolls",
        plexLoc: "",
        servers: [],
        isGetting: false,
        isLoaded: false,
        isIncomplete: false,
        isSaved: false,
        polling: "1",
        advanced: this.props.settings.advanced ?? false,
        logLevel: "0",
      };
    }
  }

  handleFormSubmit = (e) => {
    e.preventDefault();

    this.setState({ isIncomplete: false });

    if (this.state.ip === "" || this.state.port === "") {
      this.setState({ isIncomplete: true });
      return;
    }

    if (!this.props.settings.settings) this.props.settings.settings = {};

    this.props.settings.settings.ip = this.state.ip;
    this.props.settings.settings.port = this.state.port;
    this.props.settings.settings.ssl = this.state.ssl;
    this.props.settings.settings.loc = this.state.loc;
    this.props.settings.settings.plexLoc = this.state.plexLoc;
    this.props.settings.connected = "true";
    this.props.settings.settings.polling = this.state.polling;
    this.props.settings.settings.logLevel = this.state.logLevel;
    this.props.connection(1);

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", async () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ isSaved: true });

          var response = await fetch("/backend/monitor", { method: "GET" });
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }
          response = await fetch("/backend/logger", { method: "GET" });
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }
          response = await fetch("/webhook", { method: "GET" });
          if (!response.ok) {
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
    xhr.send(JSON.stringify(this.props.settings));
  };

  handleServerGet = () => {
    var xhr = new XMLHttpRequest();

    this.setState({ isGetting: true });
    this.setState({ isLoaded: false });
    this.setState({ isSaved: false });

    xhr.addEventListener("readystatechange", async () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // request successful
          var response = xhr.responseText,
            json = JSON.parse(response);

          var tempList = [];
          var index = 0;

          const createServerEntry = (element, index, secure, location, socket) => ({
            index: index,
            name: element.name,
            ip: location === "remote" ? element.remoteIP : element.localIP,
            port: element.port,
            location,
            secure,
            cert: element.cert,
            certSuccessful: element.certSuccessful,
            socket: socket,
          });

          for (const element of json) {
            if (element.certSuccessful) {
              if (!element.https) {
                tempList.push(createServerEntry(element, ++index, false, "local", false));
                tempList.push(createServerEntry(element, ++index, false, "remote", false));
              }
              tempList.push(createServerEntry(element, ++index, true, "local", false));
              tempList.push(createServerEntry(element, ++index, true, "remote", false));
            } else {
              tempList.push(createServerEntry(element, ++index, false, "local", true));
              tempList.push(createServerEntry(element, ++index, false, "remote", true));
            }
          }
          this.setState({ servers: tempList });
          this.setState({ isLoaded: true });
        } else {
          // error
          this.setState({
            isLoaded: true,
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/settings", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(this.props.settings));
  };

  handleServerChange = (e) => {
    if (e.target.value !== 0) {
      if (this.state.servers[e.target.value - 1].secure) {
        this.setState({
          ip: `${this.state.servers[e.target.value - 1].ip.replace(/\./g, "-")}.${
            this.state.servers[e.target.value - 1].cert
          }.plex.direct`,
          ssl: true,
        });
      } else {
        this.setState({ ip: this.state.servers[e.target.value - 1].ip, ssl: false });
      }
      if (this.state.servers[e.target.value - 1].location === "remote") {
        this.setState({ port: this.state.servers[e.target.value - 1].port });
      } else {
        this.setState({ port: "32400" });
      }
    }
    this.setState({ isSaved: false });
  };

  handleIp = (e) => {
    this.setState({ ip: e.target.value.toString(), isSaved: false });
  };

  handlePort = (e) => {
    this.setState({ port: e.target.value.toString(), isSaved: false });
  };

  handleSSL = (e) => {
    // console.log(e.target.checked);
    this.setState({ ssl: e.target.checked, isSaved: false });
  };

  handleLoc = (e) => {
    this.setState({ loc: e.target.value.toString(), isSaved: false });
  };

  handlePlexLoc = (e) => {
    this.setState({ plexLoc: e.target.value.toString(), isSaved: false });
  };

  handlePolling = (e) => {
    this.setState({ polling: e.target.value.toString() });
  };

  handleLogLevel = (e) => {
    this.setState({ logLevel: e.target.value.toString(), isSaved: false });
  };

  handleAdvanced = () => {
    this.setState((prevState) => {
      const newMode = !prevState.advanced;

      var settings = { ...this.props.settings, advanced: newMode };

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
      xhr.send(JSON.stringify(settings));

      return { advanced: newMode };
    });
  };

  render() {
    return (
      <>
        <Row>
          <Col>
            <h3>Settings</h3>
          </Col>
          <Col className="text-end">
            {this.state.advanced ? (
              <Button type="submit" variant="secondary" onClick={this.handleAdvanced}>
                Hide Advanced
              </Button>
            ) : (
              <Button type="submit" variant="secondary" onClick={this.handleAdvanced}>
                Show Advanced
              </Button>
            )}
          </Col>
        </Row>
        <div className="div-seperator" />
        <Row>
          <Form onSubmit={this.handleFormSubmit} className={`form-content ${this.props.isDarkMode ? "dark-mode" : ""}`}>
            <h5>
              Plex Server &nbsp;&nbsp;
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>
                    Enter the Plex server's IP address and port, or use the search function to list servers associated
                    with your account.
                    <br />
                    <br />
                    For remote servers, it will be the user's responsibility to set up the remote connection path.
                  </Tooltip>
                }
              >
                <img src={Info} className="image-info" alt="info" />
              </OverlayTrigger>
            </h5>
            <div className="div-seperator" />
            {/* Server */}
            <Form.Label for="serverList">Server &nbsp;&nbsp;</Form.Label>
            <Stack gap={1} direction="horizontal">
              {this.state.isLoaded ? (
                <Form.Select
                  option="0"
                  id="serverList"
                  name="serverList"
                  onChange={this.handleServerChange}
                  size="sm"
                  className="server-list"
                >
                  <option value="0">Manual configuration</option>
                  {this.state.servers.map((server) => {
                    const certInfo = server.secure ? `${server.cert}.plex.direct` : "";
                    const ip = server.secure ? server.ip.replace(/\./g, "-") : server.ip;
                    const location = `[${server.location}]`;
                    const socket = server.socket ? `(socket hang up)` : "";
                    const secure = server.secure ? `[secure]` : "";

                    return (
                      <option
                        key={server.index} // It's a good practice to add a unique key for list items
                        value={server.index}
                        disabled={!server.certSuccessful} // Add disabled if certSuccessful is false
                      >
                        {`${server.name} (${ip}${certInfo ? `.${certInfo}` : ""}) ${location} ${secure} ${socket}`}
                      </option>
                    );
                  })}
                </Form.Select>
              ) : (
                <>
                  {this.state.isGetting ? (
                    <Form.Select value="1" id="getting" name="getting" disabled size="sm" className="server-list">
                      <option value="1">Retrieving servers...</option>
                    </Form.Select>
                  ) : (
                    <Form.Select
                      value="1"
                      id="waitForPress"
                      name="waitForPress"
                      disabled
                      size="sm"
                      className="server-list"
                    >
                      <option value="1">Press the button to load available servers</option>
                    </Form.Select>
                  )}
                </>
              )}
              <Button variant="outline-light" size="sm" onClick={this.handleServerGet} className="repeat-button">
                <Image src={Repeat} className="repeat-icon" />
              </Button>
            </Stack>
            <div className="div-seperator" />
            <Form.Label for="ip">Hostname or IP Address &nbsp;&nbsp;</Form.Label>
            <Form.Control value={this.state.ip} id="ip" name="ip" onChange={this.handleIp} size="sm" />
            <div className="div-seperator" />
            <Form.Label for="ip">Port &nbsp;&nbsp;</Form.Label>
            <Form.Control value={this.state.port} id="port" name="port" onChange={this.handlePort} size="sm" />
            <div className="div-seperator" />
            <Form.Label for="ssl">Use SSL &nbsp;&nbsp;</Form.Label>
            <Form.Check checked={this.state.ssl} id="ssl" name="ssl" onChange={this.handleSSL}></Form.Check>
            <div className="div-seperator" />
            <h5>Preroll Media &nbsp;&nbsp;</h5>
            <div className="div-seperator" />
            <Form.Label for="loc">Location of preroll media &nbsp;&nbsp;</Form.Label>
            <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip>
                  This is the root location of your Plex preroll media files.
                  <br />
                  <br />
                  This option is only available when running the application natively. If running from Docker, it will
                  be grayed out and you can set your root location through mounting the internal /prerolls directory to
                  the directory of your choosing on your host system.
                  <br />
                  <br />
                  When creating buckets, this is the directory that Preroll Plus will look for preroll media, so make
                  sure the root location of your media matches this location.
                </Tooltip>
              }
            >
              <img src={Info} className="image-info" alt="Info" />
            </OverlayTrigger>
            {this.props.settings.build === "Native" ? (
              <Form.Control value={this.state.loc} id="loc" name="loc" onChange={this.handleLoc} size="sm" />
            ) : (
              <Form.Control disabled value={this.state.loc} id="loc" name="loc" onChange={this.handleLoc} size="sm" />
            )}
            <div className="div-seperator" />
            <Form.Label for="plexLoc">Plex location of preroll media &nbsp;&nbsp;</Form.Label>
            <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip>
                  This is the location of your Plex prerolls as Plex sees them.
                  <br />
                  <br />
                  This path should corrospond to root location of your preroll files based on the location of your Plex
                  server. If you are running Preroll Plus and Plex on the same device, this should match the above path.
                  If you are running Plex on a different machine than Preroll Plus, this path will most likely be
                  different than the one above.
                </Tooltip>
              }
            >
              <img src={Info} className="image-info" alt="Info" />
            </OverlayTrigger>
            <Form.Control
              value={this.state.plexLoc}
              id="plexLoc"
              name="plexLoc"
              onChange={this.handlePlexLoc}
              size="sm"
            />
            <div className="div-seperator" />
            {this.state.advanced ? (
              <>
                <div className="div-seperator" />
                <Form.Label for="polling">
                  File Monitor Polling &nbsp;&nbsp;
                  <OverlayTrigger
                    placement="right"
                    overlay={
                      <Tooltip>
                        This setting changes backend file monitoring from using "inotify" to a polling method.
                        <br />
                        <br />
                        If you are connecting to your prerolls directory using an SMB (or similar) share, it is more
                        than likely that the file system's ability to be notified of file changes will not work.
                        <br />
                        <br />
                        If you are finding that renaming, moving, or removing files in your preroll directory isn't
                        automatically working, set this to on and Preroll Plus will monitor file changes using a
                        constant polling of the file system.
                        <br />
                        <br />
                        If everything is working correctly, it is recommended to keep this setting off.
                      </Tooltip>
                    }
                  >
                    <img src={Info} className="image-info" alt="Info" />
                  </OverlayTrigger>
                </Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    label="Off"
                    value="1"
                    id="transition"
                    name="transition"
                    onChange={this.handlePolling}
                    size="sm"
                    checked={this.state.polling === "1"}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="On"
                    value="2"
                    id="transition"
                    name="transition"
                    onChange={this.handlePolling}
                    size="sm"
                    checked={this.state.polling === "2"}
                  />
                </div>
                <div className="div-seperator" />
                <Stack gap={1} direction="horizontal">
                  Log Level:&nbsp;&nbsp;
                  <Form.Select
                    value={this.state.logLevel}
                    id="logLevel"
                    name="logLevel"
                    onChange={this.handleLogLevel}
                    size="sm"
                    className="sched-style"
                  >
                    <option value="0">Info</option>
                    <option value="1">Debug</option>
                  </Form.Select>
                </Stack>
              </>
            ) : (
              <></>
            )}
            <div className="div-seperator" />
            {/* Cancel/Save */}
            <Button type="submit" variant="secondary">
              Save
            </Button>
            &nbsp;&nbsp;
            {this.state.isIncomplete ? <i style={{ color: "#f00" }}>&nbsp; IP and Port must be filled. </i> : <></>}
            {this.state.isSaved ? <i style={{ color: "#00a700" }}>&nbsp; Settings saved. </i> : <></>}
          </Form>
        </Row>
      </>
    );
  }
}
