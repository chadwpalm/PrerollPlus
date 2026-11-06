import React, { Component } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import LoginIcon from "bootstrap-icons/icons/box-arrow-in-left.svg";
import Card from "react-bootstrap/Card";
import { api } from "../../api";
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
      return await api.post(url, { strong: true }, { headers });
    } catch (error) {
      console.error("Error", error.data || error.message);
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
      return await api.get(url, { timeout: 5000, headers });
    } catch (error) {
      console.error("Error", error.data || error.message);
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
        this.externalWindow.close();
        await this.handleGetThumb(token);
        await this.handleSaveToken(token);
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

  handleSaveToken = async (token) => {
    const settings = {
      ...this.props.settings,
      token,
      thumb: this.thumb,
      email: this.email,
      username: this.username,
      isLoggedIn: "true",
    };

    try {
      await api.post("backend/save", settings);
    } catch (err) {
      this.setState({ error: err.body || err.message });
    }

    this.props.handleLogin();
    this.props.handleUpdateThumb(this.thumb, token, this.username, this.email);
  };

  // Plex account name, email and avatar for the signed-in user
  handleGetThumb = async (token) => {
    try {
      const json = await api.post("backend/thumb", { token });
      this.thumb = json.thumb;
      this.email = json.email;
      this.username = json.username;
    } catch {
      // keep going without the avatar
    }
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
