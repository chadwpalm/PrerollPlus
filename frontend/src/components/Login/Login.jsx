import React, { Component } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import LoginIcon from "bootstrap-icons/icons/box-arrow-in-left.svg";
// import Logo from "../../images/Logo2.png";
import Card from "react-bootstrap/Card";
import { PlexOauth } from "plex-oauth";

export default class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      gotURL: false,
      gotToken: false,
      url: "",
      pin: null,
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

    let clientInformation = {
      clientIdentifier: `${this.props.settings.uuid}`, // This is a unique identifier used to identify your app with Plex.
      product: "Preroll Plus", // Name of your application
      device: `${this.props.settings.platform}`, // The type of device your application is running on
      version: `${version}`, // Version of your application
      forwardUrl: "", // Url to forward back to after signing in.
      platform: "Web", // Optional - Platform your application runs on - Defaults to 'Web'
    };

    this.externalWindow = null;
    this.plexOauth = new PlexOauth(clientInformation);
  }

  componentDidMount() {
    if (!this.state.gotURL) {
      this.plexOauth
        .requestHostedLoginURL()
        .then((data) => {
          let [hostedUILink, pinId] = data;

          this.setState({ url: `${hostedUILink}`, pin: `${pinId}` });
        })
        .catch((err) => {
          this.setState({ noInternet: true });
          throw err;
        });
      this.setState({
        gotURL: true,
      });
    }
  }

  executePoll = async () => {
    try {
      var token;
      if (!this.state.pin) {
        throw new Error("Unable to poll when pin is not initialized.");
      }
      await this.plexOauth
        .checkForAuthToken(this.state.pin)
        .then((authToken) => {
          token = authToken;
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
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=600, height=600, top=${y}, left=${x}`
    );

    await this.executePoll();
  };

  handleSaveToken = (token) => {
    var settings = { ...this.props.settings };

    settings.token = token;
    settings.thumb = this.thumb;
    settings.email = this.email;
    settings.username = this.username;

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
