import React, { Component } from "react";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import Repeat from "bootstrap-icons/icons/arrow-repeat.svg";
import Button from "react-bootstrap/Button";
import Stack from "react-bootstrap/Stack";

export default class Settings extends Component {
  constructor(props) {
    super(props);
    if (this.props.settings.settings) {
      this.state = {
        ip: this.props.settings.settings.ip,
        port: this.props.settings.settings.port,
        ssl: this.props.settings.settings.ssl,
        loc: this.props.settings.settings.loc,
        plexLoc: this.props.settings.settings.plexLoc,
        serverNum: "0",
        servers: [],
        isGetting: false,
        isLoaded: false,
        isError: false,
        isIncomplete: false,
        isSaved: false,
      };
    } else {
      this.state = {
        ip: "",
        port: "",
        ssl: false,
        loc: "/prerolls",
        plexLoc: "",
        serverNum: "0",
        servers: [],
        isGetting: false,
        isLoaded: false,
        isIncomplete: false,
        isSaved: false,
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
    this.props.connection(1);

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ isSaved: true });
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

          json.forEach((element) => {
            //create local insecure
            tempList.push({
              index: ++index,
              name: `${element.name}`,
              ip: `${element.localIP}`,
              location: "local",
              secure: false,
              cert: `${element.cert}`,
            });
            //create remote insecure
            // tempList.push({
            //   index: ++index,
            //   name: `${element.name}`,
            //   ip: `${element.remoteIP}`,
            //   port: `${element.port}`,
            //   location: "remote",
            //   secure: false,
            //   cert: `${element.cert}`,
            // });
            //create local secure
            tempList.push({
              index: ++index,
              name: `${element.name}`,
              ip: `${element.localIP}`,
              location: "local",
              secure: true,
              cert: `${element.cert}`,
            });
            //create remote secure
            // tempList.push({
            //   index: ++index,
            //   name: `${element.name}`,
            //   ip: `${element.remoteIP}`,
            //   port: `${element.port}`,
            //   location: "remote",
            //   secure: true,
            //   cert: `${element.cert}`,
            // });

            this.setState({ servers: tempList });
          });

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

  handleServers = (e) => {
    this.setState({ serverNum: e.target.value.toString() });
  };

  handleServerChange = (e) => {
    if (e.target.value != 0) {
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

  render() {
    return (
      <>
        <Row>
          <h3>Settings</h3>
        </Row>
        <div style={{ paddingBottom: "0.75rem" }} />
        <Row>
          <Form onSubmit={this.handleFormSubmit}>
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
                <img src={Info} />
              </OverlayTrigger>
            </h5>
            <div style={{ paddingBottom: "0.75rem" }} />
            {/* Server */}
            <Form.Label for="serverList">Server &nbsp;&nbsp;</Form.Label>
            <Stack gap={1} direction="horizontal">
              {this.state.isLoaded ? (
                <Form.Select
                  option={this.state.serverNum}
                  id="serverList"
                  name="serverList"
                  onChange={this.handleServerChange}
                  size="sm"
                >
                  <option value="0">Manual configuration</option>
                  {this.state.servers.map((server) => (
                    <>
                      {server.secure ? (
                        <option value={server.index}>
                          {server.name} ({server.ip.replace(/\./g, "-")}.{server.cert}.plex.direct [{server.location}]
                          [secure])
                        </option>
                      ) : (
                        <option value={server.index}>
                          {server.name} ({server.ip}) [{server.location}]
                        </option>
                      )}
                    </>
                  ))}
                </Form.Select>
              ) : (
                <>
                  {this.state.isGetting ? (
                    <Form.Select value="1" id="getting" name="getting" disabled size="sm">
                      <option value="1">Retrieving servers...</option>
                    </Form.Select>
                  ) : (
                    <Form.Select value="1" id="waitForPress" name="waitForPress" disabled size="sm">
                      <option value="1">Press the button to load available servers</option>
                    </Form.Select>
                  )}
                </>
              )}
              <Button variant="outline-light" size="sm" onClick={this.handleServerGet}>
                <img src={Repeat} />
              </Button>
            </Stack>
            <div style={{ paddingBottom: "0.75rem" }} />
            <Form.Label for="ip">Hostname or IP Address &nbsp;&nbsp;</Form.Label>
            <Form.Control value={this.state.ip} id="ip" name="ip" onChange={this.handleIp} size="sm" />
            <div style={{ paddingBottom: "0.75rem" }} />
            <Form.Label for="ip">Port &nbsp;&nbsp;</Form.Label>
            <Form.Control value={this.state.port} id="port" name="port" onChange={this.handlePort} size="sm" />
            <div style={{ paddingBottom: "0.75rem" }} />
            <Form.Label for="ssl">Use SSL &nbsp;&nbsp;</Form.Label>
            <Form.Check checked={this.state.ssl} id="ssl" name="ssl" onChange={this.handleSSL}></Form.Check>
            <div style={{ paddingBottom: "0.75rem" }} />
            <h5>Preroll Media &nbsp;&nbsp;</h5>
            <div style={{ paddingBottom: "0.75rem" }} />
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
              <img src={Info} />
            </OverlayTrigger>
            {this.props.settings.build === "Native" ? (
              <Form.Control value={this.state.loc} id="loc" name="loc" onChange={this.handleLoc} size="sm" />
            ) : (
              <Form.Control disabled value={this.state.loc} id="loc" name="loc" onChange={this.handleLoc} size="sm" />
            )}
            <div style={{ paddingBottom: "0.75rem" }} />
            <Form.Label for="plexLoc">Plex location of preroll media &nbsp;&nbsp;</Form.Label>
            <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip>
                  This is the location of your Plex prerolls as Plex sees them.
                  <br />
                  <br />
                  This option is only available when running the application in a Docker container. If running natively,
                  it will be grayed out and you can set your root location through the option above.
                  <br />
                  <br />
                  The reason for this is because when running in a Docker container the internal location in the
                  container of your media is /prerolls. You will determine the location on the host based on how you
                  mount the /prerolls volume when starting the container. Because of that, you will need to place the
                  location that Plex sees the preroll media here.
                </Tooltip>
              }
            >
              <img src={Info} />
            </OverlayTrigger>
            {this.props.settings.build === "Native" ? (
              <Form.Control
                disabled
                value={this.state.plexLoc}
                id="plexLoc"
                name="plexLoc"
                onChange={this.handlePlexLoc}
                size="sm"
              />
            ) : (
              <Form.Control
                value={this.state.plexLoc}
                id="plexLoc"
                name="plexLoc"
                onChange={this.handlePlexLoc}
                size="sm"
              />
            )}
            <div style={{ paddingBottom: "0.75rem" }} />
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
