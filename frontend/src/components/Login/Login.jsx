import React, { Component } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import LoginIcon from "bootstrap-icons/icons/box-arrow-in-left.svg";
import Card from "react-bootstrap/Card";
import { api } from "../../api";

// Browser and OS names for the Plex device details, e.g. "Firefox" 144.0 on "Linux"
function describeBrowser() {
  const ua = navigator.userAgent;
  const match = (re) => ua.match(re)?.[1];
  let browser = "Web";
  let browserVersion = "Unknown";
  for (const [name, re] of [
    ["Microsoft Edge", /Edg\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ]) {
    const version = match(re);
    if (version) {
      browser = name;
      browserVersion = version;
      break;
    }
  }
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown";
  return { browser, browserVersion, os };
}

export default class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      gotURL: false,
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
      notOwner: null, // Plex account name when the server refused it (not the owner)
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

  // Sent with every plex.tv request and in the sign-in page address (the same details Seerr sends). With the full
  // device details, Plex shows its confirmation page ("Preroll Plus would like to sign in", with "Not you?") instead
  // of approving silently with whatever account the browser is signed in to at plex.tv.
  plexHeaders = () => {
    const { browser, browserVersion, os } = describeBrowser();
    return {
      Accept: "application/json",
      "X-Plex-Product": "Preroll Plus",
      "X-Plex-Version": this.version,
      "X-Plex-Client-Identifier": this.props.settings.uuid,
      "X-Plex-Model": "Plex OAuth",
      "X-Plex-Platform": browser,
      "X-Plex-Platform-Version": browserVersion,
      "X-Plex-Device": os,
      "X-Plex-Device-Name": `${browser} (Preroll Plus)`,
      "X-Plex-Device-Screen-Resolution": `${window.screen.width}x${window.screen.height}`,
      "X-Plex-Language": "en",
    };
  };

  requestPin = () => api.post("https://plex.tv/api/v2/pins?strong=true", undefined, { headers: this.plexHeaders() });

  checkPin = (pinId) => api.get(`https://plex.tv/api/v2/pins/${pinId}`, { timeout: 5000, headers: this.plexHeaders() });

  authAppUrl = (code) => {
    const h = this.plexHeaders();
    const params = new URLSearchParams({
      clientID: h["X-Plex-Client-Identifier"],
      "context[device][product]": h["X-Plex-Product"],
      "context[device][version]": h["X-Plex-Version"],
      "context[device][platform]": h["X-Plex-Platform"],
      "context[device][platformVersion]": h["X-Plex-Platform-Version"],
      "context[device][device]": h["X-Plex-Device"],
      "context[device][deviceName]": h["X-Plex-Device-Name"],
      "context[device][model]": h["X-Plex-Model"],
      "context[device][screenResolution]": h["X-Plex-Device-Screen-Resolution"],
      "context[device][layout]": "desktop",
      code,
    });
    return `https://app.plex.tv/auth/#!?${params.toString()}`;
  };

  componentDidMount() {
    this.setState({ gotURL: true });
  }

  componentWillUnmount() {
    clearTimeout(this.pollTimer);
  }

  // Back to the Sign in button, with an optional message under the card
  stopSignIn = (error = null, notOwner = null) => {
    clearTimeout(this.pollTimer);
    this.externalWindow?.close();
    this.externalWindow = null;
    this.setState({ gettingToken: false, error, notOwner });
  };

  // Checks once a second whether the Plex sign-in finished, until the PIN expires or Cancel is pressed.
  // (popup.closed isn't used: browsers can report the popup as closed once it is on app.plex.tv.)
  executePoll = async (pinId, deadline) => {
    let pin;
    try {
      pin = await this.checkPin(pinId);
    } catch (err) {
      if (err.status === 404 && Date.now() < deadline) {
        this.pollTimer = setTimeout(() => this.executePoll(pinId, deadline), 1000);
      } else {
        this.stopSignIn("Could not reach plex.tv. Try again.");
      }
      return;
    }

    if (pin?.authToken) {
      this.externalWindow?.close();
      this.externalWindow = null;
      await this.handleSaveToken(pin.authToken);
      return;
    }
    const expires = pin?.expiresAt ? Date.parse(pin.expiresAt) : deadline;
    if (Date.now() >= Math.min(expires, deadline)) {
      this.stopSignIn("The Plex sign-in timed out. Try again.");
      return;
    }
    this.pollTimer = setTimeout(() => this.executePoll(pinId, deadline), 1000);
  };

  handlePlexAuth = async () => {
    this.setState({ gettingToken: true, error: null, notOwner: null, noInternet: false });
    const y = window.top.outerHeight / 2 + window.top.screenY - 350;
    const x = window.top.outerWidth / 2 + window.top.screenX - 300;
    // Opened right away (during the click) so the browser doesn't block it; the Plex page loads once the PIN is ready
    this.externalWindow = window.open(
      "",
      "",
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=600, height=700, top=${y}, left=${x}`,
    );

    // A new PIN for every attempt: a PIN can only be used for one sign-in
    let pin;
    try {
      pin = await this.requestPin();
    } catch {
      this.stopSignIn();
      this.setState({ noInternet: true });
      return;
    }
    if (!this.externalWindow || this.externalWindow.closed) {
      this.stopSignIn("The Plex sign-in window was blocked. Allow pop-ups for this page and try again.");
      return;
    }
    this.externalWindow.location.href = this.authAppUrl(pin.code);
    this.executePoll(pin.id, Date.now() + 15 * 60 * 1000);
  };

  // The server checks the token with plex.tv and only lets the owner's account in (backend/auth.js)
  handleSaveToken = async (token) => {
    try {
      await api.post("backend/auth/login", { token });
    } catch (err) {
      this.stopSignIn(err.message, err.status === 403 ? (err.data?.username ?? "") : null);
      return;
    }
    this.props.handleLogin();
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
                  <Button variant="secondary" style={{ width: "100%" }} onClick={() => this.stopSignIn()}>
                    Waiting for Plex... (Cancel)
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
            {this.props.onCancel && (
              <Row style={{ textAlign: "center", paddingTop: "15px" }}>
                <div>
                  <Button
                    variant="link"
                    onClick={() => {
                      this.stopSignIn();
                      this.props.onCancel();
                    }}
                  >
                    Back to Preroll Plus
                  </Button>
                </div>
              </Row>
            )}
          </Card>
          <br />
          {this.state.error && (
            <div className="mx-auto" style={{ maxWidth: "350px", textAlign: "center", color: "#fff" }}>
              {this.state.error}
              {this.state.notOwner !== null && (
                <>
                  <br />
                  <br />
                  To use a different Plex account, press Sign in again and choose "Not you?" on the Plex page.
                </>
              )}
            </div>
          )}
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
