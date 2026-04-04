import React, { Component } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import Repeat from "bootstrap-icons/icons/arrow-repeat.svg";
import Copy from "bootstrap-icons/icons/copy.svg";
import Button from "react-bootstrap/Button";
import Stack from "react-bootstrap/Stack";
import Image from "react-bootstrap/Image";
import { v4 as uuid } from "uuid";
import SettingsSection from "../SettingsSection/SettingsSection";
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
        holidaySource: this.props.settings.settings.holidaySource ?? "1",
        apiKey: this.props.settings.settings.apiKey ?? "",
        isCacheSuccess: false,
        isCacheFailed: false,
        dayOfWeek: this.props.settings.settings.dayOfWeek ?? "0",
        logSize: this.props.settings.settings.logSize ?? "1",
        logFiles: this.props.settings.settings.logFiles ?? "5",
        appPort: this.props.settings.settings.appPort ?? "4949",
        baseURL: this.props.settings.settings.baseURL ?? "",
        deletion: this.props.settings.settings.deletion ?? "1",
        mainApiKey: this.props.settings.mainApiKey ?? "",
        copySuccess: false,
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
        holidaySource: "1",
        apiKey: "",
        isCacheSuccess: false,
        isCacheFailed: false,
        dayOfWeek: "0",
        logSize: "1",
        logFiles: "5",
        appPort: "4949",
        baseURL: "",
        deletion: "1",
        mainApiKey: "",
        copySuccess: false,
      };
    }
  }

  handleFormSubmit = async (e) => {
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
    this.props.settings.settings.logSize = this.state.logSize;
    this.props.settings.settings.logFiles = this.state.logFiles;
    this.props.settings.settings.apiKey = this.state.apiKey;
    this.props.settings.settings.dayOfWeek = this.state.dayOfWeek;
    this.props.settings.settings.appPort = this.state.appPort;
    this.props.settings.settings.baseURL = this.state.baseURL;
    this.props.settings.settings.deletion = this.state.deletion;
    this.props.connection(1);

    try {
      const saveResponse = await fetch("backend/save", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify(this.props.settings),
      });

      if (!saveResponse.ok) throw new Error(`Save failed: ${saveResponse.status}`);

      this.setState({ isSaved: true });

      const monitorResp = await fetch("backend/monitor");
      if (!monitorResp.ok) throw new Error(`Monitor failed: ${monitorResp.status}`);

      const loggerResp = await fetch("backend/logger");
      if (!loggerResp.ok) throw new Error(`Logger failed: ${loggerResp.status}`);

      const webhookResp = await fetch("webhook");
      if (!webhookResp.ok) throw new Error(`Webhook failed: ${webhookResp.status}`);
    } catch (err) {
      console.error(err);
      this.setState({ error: err.message });
    }
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

    xhr.open("POST", "backend/settings", true);
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

  handleLogSize = (e) => {
    this.setState({ logSize: e.target.value.toString() });
  };

  handleLogFiles = (e) => {
    this.setState({ logFiles: e.target.value.toString() });
  };

  handleAPIKey = (e) => {
    this.setState({ apiKey: e.target.value.toString() });
  };

  handleMainApiKey = (e) => {
    this.setState({ mainApiKey: e.target.value.toString() });
  };

  handleDayOfWeek = (e) => {
    this.setState({ dayOfWeek: e.target.value.toString() });
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

      xhr.open("POST", "backend/save", true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(settings));

      return { advanced: newMode };
    });
  };

  handleCache = () => {
    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ isCacheSuccess: true });
        } else if (xhr.status === 500) {
          this.setState({ isCacheFailed: true });
        } else {
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("GET", "backend/clearcache", true);
    xhr.send();
  };

  handleAppPort = (e) => {
    this.setState({ appPort: e.target.value.toString() });
  };

  handleBaseURL = (e) => {
    this.setState({ baseURL: e.target.value.toString() });
  };

  handleDeletion = (e) => {
    this.setState({ deletion: e.target.value.toString() });
  };

  handleGenerateApiKey = () => {
    const newApiKey = uuid().replace(/-/g, "");

    this.setState((prevState) => {
      const settings = { ...this.props.settings };

      if (!settings.settings) {
        settings.settings = {};
      }

      settings.mainApiKey = newApiKey;

      const xhr = new XMLHttpRequest();
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            this.setState({
              mainApiKey: newApiKey,
              isSaved: true,
            });
          } else {
            this.setState({
              error: xhr.responseText || "Failed to save API key",
            });
          }
        }
      });

      xhr.open("POST", "backend/save", true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(settings));

      return { mainApiKey: newApiKey };
    });
  };

  render() {
    return (
      <>
        <Row className="mb-3">
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
        <Row>
          <Form
            onSubmit={this.handleFormSubmit}
            className={`mb-4 form-content ${this.props.isDarkMode ? "dark-mode" : ""}`}
          >
            <SettingsSection title="Plex Server" isDarkMode={this.props.isDarkMode}>
              {/* Server Selection */}
              <h6 className="mb-2">
                Server &nbsp;&nbsp;
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
              </h6>

              <Stack gap={2} direction="horizontal" className="mb-3">
                {this.state.isLoaded ? (
                  <Form.Select
                    id="serverList"
                    name="serverList"
                    onChange={this.handleServerChange}
                    size="sm"
                    className="server-list flex-grow-1"
                  >
                    <option value="0">Manual configuration</option>
                    {this.state.servers.map((server) => {
                      const certInfo = server.secure ? `${server.cert}.plex.direct` : "";
                      const ip = server.secure ? server.ip.replace(/\./g, "-") : server.ip;
                      const location = `[${server.location}]`;
                      const socket = server.socket ? "(Insecure connection not allowed)" : "";
                      const secure = server.secure ? "[secure]" : "";

                      return (
                        <option key={server.index} value={server.index} disabled={!server.certSuccessful}>
                          {`${server.name} (${ip}${certInfo ? `.${certInfo}` : ""}) ${location} ${secure} ${socket}`}
                        </option>
                      );
                    })}
                  </Form.Select>
                ) : (
                  <Form.Select value="1" disabled size="sm" className="server-list flex-grow-1">
                    <option value="1">
                      {this.state.isGetting ? "Retrieving servers..." : "Press the button to load available servers"}
                    </option>
                  </Form.Select>
                )}

                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={this.handleServerGet}
                  className="repeat-button d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "31px" }}
                >
                  <Image src={Repeat} className="repeat-icon" />
                </Button>
              </Stack>

              {/* Hostname / IP */}
              <Form.Group className="mb-3">
                <h6>Hostname or IP Address</h6>
                <Form.Control value={this.state.ip} id="ip" name="ip" onChange={this.handleIp} size="sm" />
              </Form.Group>

              {/* Port */}
              <Form.Group className="mb-3">
                <h6>Port</h6>
                <Form.Control value={this.state.port} id="port" name="port" onChange={this.handlePort} size="sm" />
              </Form.Group>

              {/* SSL */}
              <Form.Group>
                <h6>Use SSL</h6>
                <Form.Check checked={this.state.ssl} id="ssl" name="ssl" onChange={this.handleSSL} type="switch" />
              </Form.Group>
            </SettingsSection>
            <SettingsSection title="Preroll Media" isDarkMode={this.props.isDarkMode}>
              {/* Location of preroll media */}
              <h6>
                Location of Preroll Media &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      This is the root location of your Plex preroll media files.
                      <br />
                      <br />
                      This option is only available when running the application natively. If running from Docker, it
                      will be grayed out and you can set your root location through mounting the internal /prerolls
                      directory to the directory of your choosing on your host system.
                      <br />
                      <br />
                      When creating buckets, this is the directory that Preroll Plus will look for preroll media, so
                      make sure the root location of your media matches this location.
                    </Tooltip>
                  }
                >
                  <img src={Info} className="image-info" alt="Info" />
                </OverlayTrigger>
              </h6>
              {this.props.settings.build === "Native" ? (
                <Form.Control
                  value={this.state.loc}
                  id="loc"
                  name="loc"
                  onChange={this.handleLoc}
                  size="sm"
                  className="mb-3"
                />
              ) : (
                <Form.Control
                  disabled
                  value={this.state.loc}
                  id="loc"
                  name="loc"
                  onChange={this.handleLoc}
                  size="sm"
                  className="mb-3"
                />
              )}
              {/* Plex location of preroll media */}
              <h6>
                Plex Location of Preroll Media &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      This is the location of your Plex prerolls as Plex sees them.
                      <br />
                      <br />
                      This path should correspond to root location of your preroll files based on the location of your
                      Plex server. If you are running Preroll Plus and Plex on the same device, this should match the
                      above path. If you are running Plex on a different machine than Preroll Plus, this path will most
                      likely be different than the one above.
                    </Tooltip>
                  }
                >
                  <img src={Info} className="image-info" alt="Info" />
                </OverlayTrigger>
              </h6>
              <Form.Control
                value={this.state.plexLoc}
                id="plexLoc"
                name="plexLoc"
                onChange={this.handlePlexLoc}
                size="sm"
                className={this.state.advanced ? "mb-3" : "mb-2"}
              />
              {this.state.advanced ? (
                <>
                  <h6>
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
                  </h6>
                  <div className="mb-3">
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
                  <h6>
                    Prevent File Deletion From Buckets &nbsp;&nbsp;
                    <OverlayTrigger
                      placement="right"
                      overlay={
                        <Tooltip>
                          Setting this to "On" will prevent files from being deleted from buckets when they are deleted
                          from the file system.
                          <br />
                          <br />
                          Since the file system is continually being monitored for changes, this solves the issue of
                          files in buckets wrongfully getting deleted when the SMB share disconnects or fails.
                        </Tooltip>
                      }
                    >
                      <img src={Info} className="image-info" alt="Info" />
                    </OverlayTrigger>
                  </h6>
                  <div>
                    <Form.Check
                      inline
                      type="radio"
                      label="Off"
                      value="1"
                      id="deletion"
                      name="deletion"
                      onChange={this.handleDeletion}
                      size="sm"
                      checked={this.state.deletion === "1"}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      label="On"
                      value="2"
                      id="deletion"
                      name="deletion"
                      onChange={this.handleDeletion}
                      size="sm"
                      checked={this.state.deletion === "2"}
                    />
                  </div>
                </>
              ) : (
                <></>
              )}
            </SettingsSection>
            <SettingsSection title="Holidays" isDarkMode={this.props.isDarkMode}>
              <h6>
                Calendarific API Key &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      Enter Calendarific API key here.
                      <br />
                      <br />
                      You can find your API key on your account dashboard toward the bottom of the page.
                    </Tooltip>
                  }
                >
                  <img src={Info} className="image-info" alt="Info" />
                </OverlayTrigger>
                &nbsp;&nbsp;&nbsp;&nbsp;Get account and API key at{" "}
                <a href="https://calendarific.com" target="_blank" rel="noreferrer">
                  calendarific.com
                </a>
              </h6>
              <Form.Control
                placeholder="Enter API Key if using Calendarific"
                value={this.state.apiKey}
                id="apyKey"
                name="apyKey"
                onChange={this.handleAPIKey}
                size="sm"
                className="mb-3"
              />
              <Stack gap={3} direction="horizontal" className={this.state.advanced ? "mb-3" : ""}>
                {this.state.advanced ? (
                  <>
                    <Button variant={this.props.isDarkMode ? "outline-light" : "light"} onClick={this.handleCache}>
                      Clear Calendarific Cache
                    </Button>
                    {this.state.isCacheSuccess ? (
                      <i style={{ color: "#00a700" }}>&nbsp; Cache cleared successfully. </i>
                    ) : (
                      <></>
                    )}
                    {this.state.isCacheFailed ? (
                      <i style={{ color: "#f00" }}>&nbsp; Error clearing cache. Check logs. </i>
                    ) : (
                      <></>
                    )}
                  </>
                ) : (
                  <></>
                )}
              </Stack>
              <h6>Calendar Day of Week Start</h6>
              <div>
                <Form.Check
                  inline
                  type="radio"
                  label="Sunday"
                  value="0"
                  id="dayOfWeek"
                  name="dayOfWeek"
                  onChange={this.handleDayOfWeek}
                  size="sm"
                  checked={this.state.dayOfWeek === "0"}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Monday"
                  value="1"
                  id="dayOfWeek"
                  name="dayOfWeek"
                  onChange={this.handleDayOfWeek}
                  size="sm"
                  checked={this.state.dayOfWeek === "1"}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Saturday"
                  value="6"
                  id="dayOfWeek"
                  name="dayOfWeek"
                  onChange={this.handleDayOfWeek}
                  size="sm"
                  checked={this.state.dayOfWeek === "6"}
                />
              </div>
            </SettingsSection>
            <SettingsSection title="Host" isDarkMode={this.props.isDarkMode}>
              <h6>
                Port Number &nbsp;&nbsp;
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      The port number Preroll Plus runs on. If left blank the port will default to "4949".
                      <br />
                      <br />
                      Note: If running in a Docker container this will be the port as seen <i>inside</i> the container.
                      If APP_PORT is used as an ENV variable, it will override this port setting.
                    </Tooltip>
                  }
                >
                  <img src={Info} className="image-info" alt="Info" />
                </OverlayTrigger>
              </h6>
              <Form.Control
                value={this.state.appPort}
                id="appPort"
                name="appPort"
                onChange={this.handleAppPort}
                size="sm"
              />
              <div className="footnote mb-3">Requires restart to take effect</div>
              <Form.Label for="baseURL">URL Base &nbsp;&nbsp;</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>
                    For reverse proxy support, default is empty.
                    <br />
                    <br />
                    Note: If using a reverse proxy (example: mydomain.com/prerollplus) you would enter '/prerollplus'
                    for URL Base.
                  </Tooltip>
                }
              >
                <img src={Info} className="image-info" alt="Info" />
              </OverlayTrigger>
              <Form.Control
                value={this.state.baseURL}
                id="baseURL"
                name="baseURL"
                onChange={this.handleBaseURL}
                size="sm"
              />
              <div className="footnote">Requires restart to take effect</div>
            </SettingsSection>
            <SettingsSection title="Security" isDarkMode={this.props.isDarkMode}>
              <Stack direction="horizontal" gap={2}>
                <h6>API Key</h6>
                {this.state.copySuccess && <span className="text-success mb-1">Copied!</span>}
              </Stack>
              <Stack direction="horizontal" gap={2} className="mb-3">
                <Form.Control value={this.state.mainApiKey} readOnly id="mainApyKey" name="mainApyKey" size="sm" />
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={() => {
                    if (!this.state.mainApiKey) return;
                    navigator.clipboard.writeText(this.state.mainApiKey).then(() => {
                      this.setState({ copySuccess: true });
                      setTimeout(() => this.setState({ copySuccess: false }), 2000);
                    });
                  }}
                  className="repeat-button d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "31px" }}
                >
                  <Image src={Copy} className="repeat-icon" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={this.handleGenerateApiKey}
                  className="repeat-button d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "31px" }}
                >
                  <Image src={Repeat} className="repeat-icon" />
                </Button>
              </Stack>
            </SettingsSection>
            {this.state.advanced ? (
              <SettingsSection title="Logging" isDarkMode={this.props.isDarkMode}>
                <h6>Log Level</h6>
                <Form.Select
                  value={this.state.logLevel}
                  id="logLevel"
                  name="logLevel"
                  onChange={this.handleLogLevel}
                  size="sm"
                  className="sched-style mb-3"
                >
                  <option value="0">Info</option>
                  <option value="1">Debug</option>
                </Form.Select>
                <h6>
                  Log Size Limit &nbsp;&nbsp;
                  <OverlayTrigger
                    placement="right"
                    overlay={<Tooltip>Maximum log file size in MB before archiving. Default is 1MB.</Tooltip>}
                  >
                    <img src={Info} className="image-info" alt="Info" />
                  </OverlayTrigger>
                </h6>
                <Stack direction="horizontal" gap={2} style={{ maxWidth: "220px" }} className="mb-3">
                  <Form.Control
                    type="number"
                    min={1}
                    max={10}
                    value={this.state.logSize}
                    onChange={this.handleLogSize}
                    size="sm"
                    style={{ width: "80px" }}
                  />
                  <span>MB</span>
                </Stack>
                <h6>
                  Max Files &nbsp;&nbsp;
                  <OverlayTrigger
                    placement="right"
                    overlay={<Tooltip>Maximum number of log files to archive.</Tooltip>}
                  >
                    <img src={Info} className="image-info" alt="Info" />
                  </OverlayTrigger>
                </h6>
                <Form.Control
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={this.state.logFiles}
                  style={{ width: "80px" }}
                  onChange={this.handleLogFiles}
                />
              </SettingsSection>
            ) : (
              <></>
            )}
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
