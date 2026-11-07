import React from "react";
import { Component } from "react";
import Loading from "../../images/loading-gif.gif";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "../Login/Login";
import Sequences from "../Sequences/Sequences";
import Buckets from "../Buckets/Buckets";
import Settings from "../Settings/Settings";
import Announce from "./Announce";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import "bootstrap/dist/css/bootstrap.min.css";
// Using `Nav.Link` as={Link} for client-side navigation
import Logout from "bootstrap-icons/icons/box-arrow-right.svg";
import Moon from "bootstrap-icons/icons/moon-stars.svg";
import Sun from "bootstrap-icons/icons/sun.svg";
import Modal from "react-bootstrap/Modal";
import NavDropdown from "react-bootstrap/NavDropdown";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import { api, SIGNED_OUT_EVENT } from "../../api";
import "./App.css";
import SequenceCalendar from "../Calendar/Calendar";

// Injected by the server (app.js); "/" when running under the Vite dev server
const baseName = window.__BASE_PATH__ || "/";

export default class App extends Component {
  state = {
    isLoaded: false,
    isConnected: false,
    error: null,
    config: {},
    show: false,
    fullscreen: true,
    fullscreenAnn: true,
    isLoggedIn: false,
    isUpdate: false,
    isOnline: true,
    announce: false,
    dismiss: false,
    isDarkMode: false,
    announcement: true, // set to true for releases that have an announcement in Announce.jsx
    sockConnected: false,
    cannotConnect: false,
    reconnectAttempts: 0,
    isBucket: false,
    auth: {}, // backend/auth/status: whether this browser is let in, and the Plex sign-in client details
  };

  componentDidMount() {
    window.addEventListener(SIGNED_OUT_EVENT, this.handleSignedOut);
    this.loadSettings();
  }

  componentWillUnmount() {
    window.removeEventListener(SIGNED_OUT_EVENT, this.handleSignedOut);
  }

  // A backend request was refused (session ended or Authentication changed): back to the sign-in page
  handleSignedOut = () => {
    if (this.state.isLoggedIn) this.setState({ isLoggedIn: false });
  };

  // Newer version available? Dev builds compare with the develop branch, releases with main.
  async checkForUpdate(json) {
    const branch = json.branch === "dev" ? "develop" : "main";
    const url = `https://raw.githubusercontent.com/chadwpalm/PrerollPlus/${branch}/version.json?cb=${Date.now()}`;
    try {
      const latest = await api.get(url);
      return { online: true, isUpdate: latest?.version !== json.version };
    } catch {
      // Dev builds treat an unreachable GitHub as "no internet" (as before); releases just skip the check
      return { online: json.branch !== "dev", isUpdate: false };
    }
  }

  async loadSettings() {
    // First ask whether this browser may use the app (backend/auth.js); the sign-in page needs these details too
    let auth;
    try {
      auth = await api.get(`${baseName}backend/auth/status`);
    } catch (err) {
      this.setState({ isLoaded: true, error: err.body || err.message });
      return;
    }

    const { online, isUpdate } = await this.checkForUpdate(auth);
    if (!online) {
      this.setState({ isOnline: false });
      return;
    }

    if (!auth.allowed) {
      this.setState({ isLoaded: true, isLoggedIn: false, auth });
      return;
    }

    let json;
    try {
      json = await api.get(`${baseName}backend/load`);
    } catch (err) {
      if (err.status === 401) this.setState({ isLoaded: true, isLoggedIn: false, auth });
      else this.setState({ isLoaded: true, error: err.body || err.message });
      return;
    }

    this.connectWebSocket();

    this.setState(
      {
        isLoaded: true,
        config: json,
        thumb: json.thumb,
        isBucket: json.buckets.length !== 0,
        isUpdate,
        isLoggedIn: true,
        auth,
        isConnected: json.connected === "true",
        isDarkMode: json.darkMode,
      },
      this.toggleBodyClass,
    );

    // Show the announcement after an update (unless dismissed); it appears once the signed-in pages show
    if (json.message) this.handleOpenAnn();
  }

  connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // Under the URL base, so a reverse proxy passes it through and the session cookie is sent with it
    this.ws = new WebSocket(`${protocol}://${window.location.host}${baseName}`);

    this.ws.onopen = () => {
      console.log("WebSocket connection opened");
      this.setState({ sockConnected: true, reconnectAttempts: 0 });
    };

    this.ws.onmessage = (event) => {
      if (event.data === "update-config") {
        this.refreshConfig();
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
      this.setState({ sockConnected: false });

      if (this.state.reconnectAttempts < 2) {
        console.log("Attempting to reconnect...");
        this.setState(
          (prevState) => ({
            reconnectAttempts: prevState.reconnectAttempts + 1,
          }),
          () => {
            setTimeout(() => {
              this.connectWebSocket();
            }, 3000);
          },
        );
      } else {
        console.log("Max reconnect attempts reached.");
        this.setState({ cannotConnect: true });
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  refreshConfig() {
    api
      .get(`${baseName}backend/load`)
      .then((config) => this.setState({ config }))
      .catch((error) => console.error("Error refreshing config:", error));
  }

  toggleBodyClass = () => {
    if (this.state.isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  };

  handleLogin = () => {
    window.location.reload(false);
  };

  handleConnectionChange = (change) => {
    change ? this.setState({ isConnected: true }) : this.setState({ isConnected: false });
  };

  handleClose = () => this.setState({ show: false });

  handleOpen = () => {
    this.setState({ show: true, fullscreen: "md-down" });
    // Config/app folders come from the server (CONFIG_DIR can change the config folder)
    fetch("backend/host")
      .then((res) => (res.ok ? res.json() : null))
      .then((host) => host && this.setState({ host }))
      .catch(() => {});
  };

  handleCloseAnn = () => {
    this.setState({ announce: false });
    if (this.state.dismiss) {
      const settings = { ...this.state.config, message: false };
      api.post(`${baseName}backend/save`, settings).catch((err) => this.setState({ error: err.body || err.message }));
    }
  };

  handleOpenAnn = () => this.setState({ announce: true, fullscreenAnn: "md-down" });

  handleDismiss = () => {
    if (this.state.dismiss) {
      this.setState({ dismiss: false });
    } else {
      this.setState({ dismiss: true });
    }
  };

  // Ends this browser's session only (other browsers stay signed in)
  handleLogout = async () => {
    try {
      await api.post(`${baseName}backend/auth/logout`);
    } catch {
      // reload anyway
    }
    window.location.reload(false);
  };

  updateSettings = (newSettings) => {
    this.setState({ config: newSettings });
  };

  handleBuckets = () => {
    this.setState({ isBucket: true });
  };

  handleDark = () => {
    this.setState((prevState) => {
      const newMode = !prevState.isDarkMode;

      const settings = { ...prevState.config, darkMode: newMode };
      api.post(`${baseName}backend/save`, settings).catch((err) => this.setState({ error: err.body || err.message }));

      return { isDarkMode: newMode, config: settings };
    }, this.toggleBodyClass);
  };

  render() {
    if (!this.state.isOnline) {
      return (
        <>
          Preroll Plus requires an internet connection. If you are running Preroll Plus in Docker, check your Docker
          network settings.
        </>
      );
    } else {
      if (!this.state.isLoaded) {
        return (
          <div>
            <img src={Loading} alt="Loading" width="50" />
          </div>
        );
      } else if (this.state.error) {
        return <div>Error occured: {this.state.error}</div>;
      } else {
        if (this.state.isLoggedIn) {
          return (
            <Router basename={baseName}>
              <Container fluid>
                <Row className={`navbar-row ${this.state.isDarkMode ? "dark-mode" : ""}`}>
                  <Navbar className={`navbar-content ${this.state.isDarkMode ? "dark-mode" : ""}`} expand="md">
                    <Navbar.Brand>
                      <div className="d-inline-block align-top">
                        <h2>
                          <b>Preroll Plus</b>
                        </h2>
                      </div>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                      <Nav className="me-auto">
                        {!this.state.isConnected ? (
                          <>
                            <Nav.Link as={Link} to="/" disabled>
                              Sequences
                            </Nav.Link>
                            <Nav.Link as={Link} to="/calendar" disabled>
                              Calendar
                            </Nav.Link>
                            <Nav.Link as={Link} to="/buckets" disabled>
                              Buckets
                            </Nav.Link>
                          </>
                        ) : (
                          <>
                            {this.state.config.buckets.length === 0 ? (
                              <>
                                <Nav.Link as={Link} to="/" disabled>
                                  Sequences
                                </Nav.Link>
                                <Nav.Link as={Link} to="/calendar" disabled>
                                  Calendar
                                </Nav.Link>
                              </>
                            ) : (
                              <>
                                <Nav.Link as={Link} to="/">
                                  Sequences
                                </Nav.Link>
                                <Nav.Link as={Link} to="/calendar">
                                  Calendar
                                </Nav.Link>
                              </>
                            )}

                            <Nav.Link as={Link} to="/buckets">
                              Buckets
                            </Nav.Link>
                          </>
                        )}

                        <Nav.Link as={Link} to="/settings">
                          Settings
                        </Nav.Link>
                      </Nav>

                      <Nav className="ms-auto d-flex align-items-center">
                        <Image
                          src={this.state.isDarkMode ? Sun : Moon}
                          className="moon-icon"
                          onClick={this.handleDark}
                        />
                        &nbsp;&nbsp;
                        <NavDropdown
                          menuVariant={this.state.isDarkMode ? "dark" : "secondary"}
                          id="dropdown-menu-align-end"
                          align="end"
                          title={
                            <>
                              <Image roundedCircle src={this.state.config.thumb} className="img-thumbnail" />
                              {this.state.isUpdate ? (
                                <Badge pill bg="danger" className="position-absolute top-20 translate-middle start-55">
                                  !
                                </Badge>
                              ) : (
                                <></>
                              )}
                            </>
                          }
                        >
                          <NavDropdown.Header>
                            <b>{this.state.config.username}</b>
                            <br />
                            {this.state.config.email}
                          </NavDropdown.Header>
                          <NavDropdown.Divider />
                          <NavDropdown.Item href="https://prerollplus.org" target="_blank">
                            Documentation
                          </NavDropdown.Item>
                          <NavDropdown.Item onClick={this.handleOpen}>About</NavDropdown.Item>
                          <NavDropdown.Item href="https://www.buymeacoffee.com/lumunarr" target="_blank">
                            Donate
                          </NavDropdown.Item>
                          {this.state.isUpdate ? (
                            <NavDropdown.Item
                              href="https://github.com/chadwpalm/PrerollPlus/blob/develop/history.md"
                              target="_blank"
                              className="nav-dropdown-update"
                            >
                              Update Available
                            </NavDropdown.Item>
                          ) : (
                            <></>
                          )}
                          {this.state.auth.signedIn && (
                            <NavDropdown.Item onClick={this.handleLogout} className="d-flex align-items-center">
                              <img src={Logout} alt="Logout" className="logout-icon" />
                              &nbsp; Sign Out
                            </NavDropdown.Item>
                          )}
                        </NavDropdown>
                      </Nav>
                    </Navbar.Collapse>
                  </Navbar>
                </Row>

                <Modal
                  show={this.state.show}
                  fullscreen={this.state.fullscreen}
                  onHide={this.handleClose}
                  size="lg"
                  animation={true}
                  className={this.state.isDarkMode ? "dark-mode" : ""}
                >
                  <Modal.Header closeButton closeVariant={this.state.isDarkMode ? "white" : ""}>
                    <Modal.Title>About</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <b>Version:</b> &nbsp;{this.state.config.version}
                    <br />
                    <b>Branch:</b> &nbsp;{this.state.config.branch}
                    <br />
                    <b>Build:</b> &nbsp;{this.state.config.build}
                    <br />
                    <b>Config Dir:</b>&nbsp; {this.state.host?.configDir ?? "…"}
                    <br />
                    <b>App Dir:</b>&nbsp; {this.state.host?.appDir ?? this.state.config.appDir}
                    <br />
                    <b>Docker:</b>&nbsp;
                    <a
                      href="https://hub.docker.com/repository/docker/chadwpalm/prerollplus/general"
                      target="_blank"
                      rel="noreferrer"
                    >
                      chadwpalm/prerollplus
                    </a>
                    <br />
                    <b>Source:</b>&nbsp;
                    <a href="https://github.com/chadwpalm/PrerollPlus" target="_blank" rel="noreferrer">
                      github.com/chadwpalm/PrerollPlus
                    </a>
                  </Modal.Body>
                </Modal>
                {this.state.announcement ? (
                  <Announce
                    announce={this.state.announce}
                    fullscreenAnn={this.state.fullscreenAnn}
                    handleCloseAnn={this.handleCloseAnn}
                    handleDismiss={this.handleDismiss}
                    dismiss={this.state.dismiss}
                    isDarkMode={this.state.isDarkMode}
                  />
                ) : (
                  <></>
                )}

                <Row className="main-row">
                  <Routes>
                    <Route
                      path="/settings"
                      element={
                        <Settings
                          settings={this.state.config}
                          auth={this.state.auth}
                          connection={this.handleConnectionChange}
                          isDarkMode={this.state.isDarkMode}
                        />
                      }
                    />

                    {!this.state.isConnected ? (
                      <Route path="*" element={<Navigate replace to="/settings" />} />
                    ) : (
                      <>
                        {!this.state.isBucket ? (
                          <Route
                            path="/"
                            element={
                              <Buckets
                                settings={this.state.config}
                                updateSettings={this.updateSettings}
                                isDarkMode={this.state.isDarkMode}
                                sockConnected={this.state.sockConnected}
                                cannotConnect={this.state.cannotConnect}
                                onSettingsChanged={this.refreshConfig.bind(this)}
                                saved={this.handleBuckets}
                              />
                            }
                          />
                        ) : (
                          <Route
                            path="/"
                            element={
                              <Sequences
                                settings={this.state.config}
                                isDarkMode={this.state.isDarkMode}
                                onSettingsChanged={this.refreshConfig.bind(this)}
                                updateSettings={this.updateSettings}
                              />
                            }
                          />
                        )}

                        <Route
                          path="/buckets"
                          element={
                            <Buckets
                              settings={this.state.config}
                              updateSettings={this.updateSettings}
                              isDarkMode={this.state.isDarkMode}
                              sockConnected={this.state.sockConnected}
                              cannotConnect={this.state.cannotConnect}
                              onSettingsChanged={this.refreshConfig.bind(this)}
                              saved={this.handleBuckets}
                            />
                          }
                        />
                        <Route
                          path="/calendar"
                          element={<SequenceCalendar isDarkMode={this.state.isDarkMode} settings={this.state.config} />}
                        />
                        {/* catch-all only redirects to "/" */}
                        <Route path="*" element={<Navigate replace to="/" />} />
                      </>
                    )}
                  </Routes>
                </Row>
              </Container>
            </Router>
          );
        } else {
          return (
            <Router basename={baseName}>
              <Routes>
                <Route path="*" element={<Navigate replace to="/login" />} />
                <Route
                  path="/login"
                  element={
                    <Login handleLogin={this.handleLogin} settings={this.state.auth} />
                  }
                />
              </Routes>
            </Router>
          );
        }
      }
    }
  }
}
