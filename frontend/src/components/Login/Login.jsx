import React, { Component } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import LoginIcon from "bootstrap-icons/icons/box-arrow-in-left.svg";
import Card from "react-bootstrap/Card";
import Axios from "axios";
import qs from "qs";

export default class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      gotURL: false,
      gotToken: false,
      url: "",
      pin: null,
      code: null,
      ip: "",
      port: "",
      ssl: false,
      saved: false,
      openWindow: false,
      gettingToken: false,
      gettingIPs: false,
      isLoading: false,
      noInternet: false,
      error: null,
    };

    let version;

    if (this.props.settings.build !== "Native") {
      if (this.props.settings.branch === "dev") {
        version = `${this.props.settings.version}.${this.props.settings.build}-dev`;
      } else {
        version = `${this.props.settings.version}.${this.props.settings.build}`;
      }
    } else {
      if (this.props.settings.branch === "dev") {
        version = `${this.props.settings.version}-dev`;
      } else {
        version = `${this.props.settings.version}`;
      }
    }

    this.externalWindow = null;
    this.version = version;
  }

  requestHostedLoginURL = async () => {
    const url = "https://plex.tv/api/v2/pins";
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Plex-Product": "Preroll Plus",
      "X-Plex-Client-Identifier": this.props.settings.uuid,
      "X-Plex-Device": this.props.settings.platform,
      "X-Plex-Version": this.version,
      "X-Plex-Platform": "Web",
    };

    try {
      const response = await Axios.post(url, { strong: true }, { headers });
      return response.data;
    } catch (error) {
      console.error("Error", error.response?.data || error.message);
      throw error;
    }
  };

  checkForAuthToken = async (pin) => {
    const url = `https://plex.tv/api/v2/pins/${pin}`;
    const headers = {
      Accept: "application/json",
      "X-Plex-Client-Identifier": this.props.settings.uuid,
      "X-Plex-Device": this.props.settings.platform,
      "X-Plex-Version": this.version,
      "X-Plex-Platform": "Web",
    };

    try {
      const response = await Axios.get(url, { timeout: 5000, headers });
      return response.data;
    } catch (error) {
      console.error("Error", error.response?.data || error.message);
      throw error;
    }
  };

  authAppUrl = (code) => {
    return (
      "https://app.plex.tv/auth#?" +
      qs.stringify({
        clientID: this.props.settings.uuid,
        code: code,
        forwardUrl: "",
        context: {
          device: {
            product: "Preroll Plus",
            device: this.props.settings.platform,
          },
        },
      })
    );
  };

  componentDidMount() {
    if (!this.state.gotURL) {
      this.requestHostedLoginURL()
        .then((data) => {
          let hostedUILink = this.authAppUrl(data.code);
          let pinId = data.id;
          this.setState({ url: `${hostedUILink}`, pin: `${pinId}`, code: `${data.code}` });
        })
        .catch((err) => {
          this.setState({ noInternet: true });
          throw err;
        });
      this.setState({ gotURL: true });
    }
  }

  executePoll = async () => {
    try {
      var token;
      if (!this.state.pin) {
        throw new Error("Unable to poll when pin is not initialized.");
      }
      await this.checkForAuthToken(this.state.pin)
        .then((data) => {
          token = data.authToken;
        })
        .catch((err) => {
          throw err;
        });

      if (token) {
        this.setState({ gotToken: true });
        this.handleGetThumb(token);
        this.handleSaveToken(token);
        this.externalWindow.close();
      } else if (token === null && !this.externalWindow.closed) {
        setTimeout(this.executePoll, 1000);
      } else {
        this.setState({ gettingToken: false });
        throw new Error("Window closed without completing login");
      }
    } catch (e) {
      this.externalWindow.close();
    }
  };

  handlePlexAuth = async () => {
    this.setState({ gettingToken: true });
    const y = window.top.outerHeight / 2 + window.top.screenY - 300;
    const x = window.top.outerWidth / 2 + window.top.screenX - 300;
    this.externalWindow = window.open(
      `${this.state.url}`,
      "",
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=600, height=600, top=${y}, left=${x}`,
    );

    await this.executePoll();
  };

  handleSaveToken = (token) => {
    var settings = { ...this.props.settings };

    settings.token = token;
    settings.thumb = this.thumb;
    settings.email = this.email;
    settings.username = this.username;
    settings.isLoggedIn = "true";

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

    xhr.open("POST", "/backend/save", false);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));

    this.props.handleLogin();
    this.props.handleUpdateThumb(this.thumb, token, this.username, this.email);
  };

  handleGetThumb = (token) => {
    var data = {};
    data.token = token;
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // request successful
          var response = xhr.responseText,
            json = JSON.parse(response);

          this.thumb = json.thumb;
          this.email = json.email;
          this.username = json.username;
        } else {
          // error
        }
      }
    });
    xhr.open("POST", "/backend/thumb", false);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(data));
  };

  render() {
    if (this.state.gotURL) {
      return (
        <Container
          fluid
          style={{ backgroundImage: "linear-gradient(to bottom right, black, #e93663)", paddingTop: "30px" }}
        >
          <Card
            className="mx-auto"
            style={{ width: "350px", paddingTop: "30px", paddingBottom: "30px", backgroundColor: "#fcfcfc" }}
          >
            <Row style={{ textAlign: "center" }}>
              <p style={{ fontSize: "50px", color: "black" }}>
                <b>Preroll Plus</b>
              </p>
            </Row>
            <Row style={{ textAlign: "center" }}>
              <p style={{ fontSize: "20px", color: "black" }}>Sign in to Plex account to continue</p>
            </Row>
            <Row>
              <div className="mx-auto" style={{ width: "350px" }}>
                {this.state.gettingToken ? (
                  <Button variant="danger" style={{ width: "100%" }} onClick={this.handlePlexAuth} disabled>
                    <div style={{ color: "#444" }}>
                      <img src={LoginIcon} alt="Login" />
                      &nbsp;&nbsp; Loading...
                    </div>
                  </Button>
                ) : this.state.noInternet ? (
                  <Button variant="danger" style={{ width: "100%" }} onClick={this.handlePlexAuth} disabled>
                    <div style={{ color: "#444" }}>
                      <img src={LoginIcon} alt="Login" />
                      &nbsp;&nbsp; Sign in
                    </div>
                  </Button>
                ) : (
                  <Button variant="danger" style={{ width: "100%" }} onClick={this.handlePlexAuth}>
                    <div style={{ color: "#444" }}>
                      <img src={LoginIcon} alt="Login" />
                      &nbsp;&nbsp; Sign in
                    </div>
                  </Button>
                )}
              </div>
            </Row>
          </Card>
          <br />
          {this.state.noInternet ? (
            <div style={{ textAlign: "center", color: "#fff" }}>
              You must have an internet connection to sign into Plex
            </div>
          ) : (
            <></>
          )}
        </Container>
      );
    }
  }
}
