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
import { default as axios } from "axios";
import "./App.css";
import SequenceCalendar from "../Calendar/Calendar";

const baseName = window.__BASE_PATH__;

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
    first: false,
    dismiss: false,
    isDarkMode: false,
    announcement: true,
    sockConnected: false,
    cannotConnect: false,
    reconnectAttempts: 0,
    isBucket: false,
  };

  componentDidMount() {
    this.connectWebSocket();

    var xhr = new XMLHttpRequest();
    var state = false;
    var online = true;

    xhr.addEventListener("readystatechange", async () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = xhr.responseText,
            json = JSON.parse(response);

          var url = "";

          if (json.branch === "dev") {
            url = `https://raw.githubusercontent.com/chadwpalm/PrerollPlus/develop/version.json?cb=${Date.now()}`;

            await axios
              .get(url, { headers: { "Content-Type": "application/json;charset=UTF-8" } })
              .then(function (response) {
                var data = response.data;
                if (data.version !== json.version) {
                  state = true;
                }
              })
              .catch(function (error) {
                online = false;
              });
          } else {
            url = `https://raw.githubusercontent.com/chadwpalm/PrerollPlus/main/version.json`;

            await axios
              .get(url, { headers: { "Content-Type": "application/json;charset=UTF-8" } })
              .then(function (response) {
                var data = response.data;

                if (data.version !== json.version) {
                  state = true;
                }
              })
              .catch(function (error) {});
          }

          if (!online) {
            this.setState({ isOnline: false });
          } else {
            this.setState({
              isLoaded: true,
              config: json,
              thumb: json.thumb,
            });

            if (json.buckets.length !== 0) this.setState({ isBucket: true });

            if (state) this.setState({ isUpdate: true });

            if (json.isLoggedIn === "true") this.setState({ isLoggedIn: true });

            if (json.connected === "true") {
              this.setState({ isConnected: true });
            }

            if (json.message) this.setState({ first: true });

            this.setState({ isDarkMode: json.darkMode }, () => {
              this.toggleBodyClass();
            });
          }
        } else {
          this.setState({
            isLoaded: true,
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("GET", `${baseName}backend/load`, true);
    xhr.send();
  }

  connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(`${protocol}://${window.location.host}`);

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
    axios
      .get(`${baseName}backend/load`)
      .then((response) => {
        this.setState({
          config: response.data,
        });
      })
      .catch((error) => {
        console.error("Error refreshing config:", error);
      });
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

  handleOpen = () => this.setState({ show: true, fullscreen: "md-down" });

  handleCloseAnn = () => {
    this.setState({ announce: false });
    if (this.state.dismiss) {
      var settings = { ...this.state.config };

      settings.message = false;

      var xhr = new XMLHttpRequest();

      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
          } else {
            this.setState({
              error: xhr.responseText,
            });
          }
        }
      });

      xhr.open("POST", `${baseName}backend/save`, true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(settings));
    }
  };

  handleOpenAnn = () => this.setState({ announce: true, first: false, fullscreenAnn: "md-down" });

  handleDismiss = () => {
    if (this.state.dismiss) {
      this.setState({ dismiss: false });
    } else {
      this.setState({ dismiss: true });
    }
  };

  handleUpdateThumb = (thumb, token, username, email) => {
    var temp = this.state.config;
    temp.token = token;
    temp.thumb = thumb;
    temp.email = email;
    temp.username = username;
    this.setState({ config: temp });
  };

  handleLogout = () => {
    var settings = { ...this.state.config };

    settings.isLoggedIn = "false";
    delete settings["thumb"];
    delete settings["email"];
    delete settings["username"];

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ isLoggedIn: false });
        } else {
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", `${baseName}backend/save`, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));
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

      var settings = { ...prevState.config, darkMode: newMode };

      var xhr = new XMLHttpRequest();

      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
          } else {
            this.setState({
              error: xhr.responseText,
            });
          }
        }
      });

      xhr.open("POST", `${baseName}backend/save`, true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(settings));

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
                          <NavDropdown.Item onClick={this.handleLogout} className="d-flex align-items-center">
                            <img src={Logout} alt="Logout" className="logout-icon" />
                            &nbsp; Sign Out
                          </NavDropdown.Item>
                        </NavDropdown>
                      </Nav>
                    </Navbar.Collapse>
                  </Navbar>
                </Row>

                {this.state.first ? this.handleOpenAnn() : <></>}
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
                    <b>Config Dir:</b>&nbsp; /config
                    <br />
                    <b>App Dir:</b>&nbsp; {this.state.config.appDir}
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
                                logout={this.handleLogout}
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
                    <Login
                      handleLogin={this.handleLogin}
                      handleUpdateThumb={this.handleUpdateThumb}
                      settings={this.state.config}
                    />
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
