// import styled from "styled-components";
import React from "react";
import { Component } from "react";
import BridgeInfo from "../Bridgeinfo/BridgeInfo";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import BridgeImage from "../../images/Bridge.svg";
import Form from "react-bootstrap/Form";
import wait from "../../images/loading-gif.gif";

export default class Bridge extends Component {
  state = {
    isLoaded: false,
    error: null,
    isBridge: null,
    isConnected: false,
    hasFailed: false,
    isSearching: false,
    isActive: false,
    bridges: [],
    manual: "",
    isManual: false,
  };
  constructor(props) {
    super(props);

    this.state.isBridge = this.props.settings.bridge ? true : false;
  }

  handleActivate = (name, id, ip) => {
    var settings = { ...this.props.settings };
    settings.bridge = { name: name, id: id, ip: ip };

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.props.settings.bridge = { name: name, id: id, ip: ip };

          this.setState({
            isBridge: "true",
          });
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
  };

  handleCreateUser = () => {
    var settings = { ...this.props.settings };

    this.setState({
      isSearching: true,
    });

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // request successful
          var response = xhr.responseText;

          if (response) {
            if (!this.props.settings.bridge) {
              this.props.settings.bridge = {};
            }
            this.props.settings.bridge.user = response;

            this.setState({
              isBridge: "true",
              isConnected: true,
              isSearching: false,
            });

            this.props.settings.connected = "true";

            this.props.connection(1);
          } else {
            this.setState({
              hasFailed: true,
              isSearching: false,
            });
          }
        } else {
          // error
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/user", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));
  };

  handleGoBack = () => {
    var settings = { ...this.props.settings };

    delete settings["bridge"];

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          delete this.props.settings["bridge"];

          this.setState({
            isConnected: false,
            isBridge: false,
            isActive: false,
            hasFailed: false,
            isLoaded: false,
            bridges: [],
          });
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
  };

  handleDelete = () => {
    var settings = { ...this.props.settings };

    delete settings["bridge"];

    settings.connected = "false";

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.props.settings.connected = "false";
          delete this.props.settings["bridge"];

          this.setState({
            isConnected: false,
            isBridge: false,
            isActive: false,
          });
          this.props.connection(0);
          this.componentDidMount();
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
  };

  handleTryAgain = () => {
    this.setState({
      isBridge: false,
      isActive: true,
      hasFailed: false,
    });
  };

  handleStartSearch = () => {
    this.setState({
      isActive: "true",
    });

    if (this.props.settings.connected === "false") {
      var xhr = new XMLHttpRequest();

      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            // request successful
            var response = xhr.responseText,
              json = JSON.parse(response);

            this.setState({
              isLoaded: true,
              bridges: json,
            });
          } else {
            // error
            this.setState({
              isLoaded: true,
              error: xhr.responseText,
            });
          }
        }
      });

      xhr.open("POST", "/backend/discover", true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send();
    }
  };

  handleRefresh = () => {
    window.location.reload(false);
  };

  handleManualInput = (e) => {
    this.setState({ manual: e.target.value.toString() });
  };

  handleManualSubmit = (e) => {
    e.preventDefault();
    this.setState({ isManual: true });

    if (this.props.settings.connected === "false") {
      var xhr = new XMLHttpRequest();

      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            // request successful
            var response = xhr.responseText,
              json = JSON.parse(response);

            this.setState({
              isLoaded: true,
              bridges: json,
              manual: "",
              isManual: false,
            });
          } else {
            // error
            this.setState({
              isLoaded: true,
              error: xhr.responseText,
            });
          }
        }
      });

      xhr.open("POST", "/backend/discover", true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify({ ip: this.state.manual }));
    }
  };

  render() {
    if (this.props.settings.connected === "false") {
      if (this.state.isBridge === false) {
        if (this.state.isActive === false) {
          return (
            <>
              <Row style={{ paddingBottom: "10px" }}>
                <h3>Bridge</h3>
              </Row>
              <h4>There are no Hue bridges connected</h4>
              <h6>
                Press search to start searching for bridges
                <br />
                on the network
              </h6>
              <Row style={{ paddingTop: "20px", marginLeft: "0px" }}>
                <Button variant="outline-secondary" style={{ width: "100px" }} onClick={this.handleStartSearch}>
                  Search
                </Button>
              </Row>
            </>
          );
        } else {
          if (!this.state.isLoaded) {
            return <h2>Scanning for bridges...</h2>;
          } else if (this.state.error) {
            return <div>Error occured: {this.state.error}</div>;
          } else {
            if (this.state.bridges.length === 0) {
              return (
                <>
                  <Row style={{ paddingBottom: "10px" }}>
                    <h3>Bridge</h3>
                  </Row>
                  <h4>There were no bridges found</h4>
                  <Row style={{ paddingTop: "10px", paddingBottom: "20px", marginLeft: "0px" }}>
                    <Button variant="outline-info" style={{ width: "120px" }} onClick={this.handleStartSearch}>
                      Search Again
                    </Button>
                    &nbsp;&nbsp;
                    <Button variant="danger" size="sm" style={{ width: "100px" }} onClick={this.handleGoBack}>
                      Cancel
                    </Button>
                  </Row>
                  <b4>If you know the IP address of the bridge on your network you can manually set it here:</b4>
                  <Row style={{ paddingTop: "10px", width: "300px" }}>
                    <Form onSubmit={this.handleManualSubmit}>
                      {!this.state.isManual ? (
                        <>
                          <Form.Control
                            value={this.state.manual}
                            placeholder="Manual IP Address"
                            onChange={this.handleManualInput}
                          />
                          <br />
                          <Button type="submit" variant="secondary" size="sm" style={{ width: "100px" }}>
                            Submit
                          </Button>
                        </>
                      ) : (
                        <>
                          <Form.Control
                            disabled
                            value={this.state.manual}
                            placeholder="Manual IP Address"
                            onChange={this.handleManualInput}
                          />
                          <br />
                          <Button disabled type="submit" variant="secondary" size="sm" style={{ width: "100px" }}>
                            <img src={wait} width="20px" />
                          </Button>
                        </>
                      )}
                    </Form>
                  </Row>
                </>
              );
            }
            if (this.state.bridges.length === 1) {
              this.handleActivate(this.state.bridges[0].name, this.state.bridges[0].Id, this.state.bridges[0].IP);
            } else {
              return (
                <>
                  <Row style={{ paddingBottom: "10px" }}>
                    <h3>Bridge</h3>
                  </Row>
                  <h4>{this.state.bridges.length} bridges were found</h4>
                  <br />
                  <h5>Please select a bridge to use below</h5>
                  {this.state.bridges.map((bridge) => (
                    <>
                      <Row style={{ paddingBottom: "10px" }}>
                        <div>
                          <BridgeInfo
                            id={bridge.Id}
                            ip={bridge.IP}
                            name={bridge.name}
                            onActivate={this.handleActivate}
                            isButton={true}
                          />
                        </div>
                      </Row>
                    </>
                  ))}
                </>
              );
            }
          }
        }
      } else {
        if (!this.state.hasFailed) {
          if (!this.state.isSearching) {
            return (
              <>
                <Row style={{ paddingBottom: "10px" }}>
                  <h3>Bridge</h3>
                </Row>
                <div style={{ paddingBottom: "10px", marginLeft: "0px" }}>
                  <BridgeInfo
                    id={this.props.settings.bridge.id}
                    ip={this.props.settings.bridge.ip}
                    name={this.props.settings.bridge.name}
                    isButton={false}
                  />
                </div>
                <h2>Click Press Me when ready</h2>
                <h6>
                  You will have 30 seconds to press the button on
                  <br />
                  the Hue Bridge
                  <br />
                  <br />
                </h6>
                <Row style={{ paddingBottom: "10px", marginLeft: "0px" }}>
                  <Button variant="outline-info" style={{ width: "100px" }} onClick={this.handleCreateUser}>
                    Press Me
                  </Button>
                  &nbsp;&nbsp;
                  <Button variant="danger" size="sm" style={{ width: "100px" }} onClick={this.handleGoBack}>
                    Cancel
                  </Button>
                </Row>
              </>
            );
          } else {
            return (
              <>
                <Row style={{ paddingBottom: "10px" }}>
                  <h3>Bridge</h3>
                </Row>
                <div style={{ paddingBottom: "10px", marginLeft: "0px" }}>
                  <BridgeInfo
                    id={this.props.settings.bridge.id}
                    ip={this.props.settings.bridge.ip}
                    name={this.props.settings.bridge.name}
                    isButton={false}
                  />
                </div>
                <h3>Press the bridge button...</h3>
                <img src={BridgeImage} style={{ width: "200px" }} />
              </>
            );
          }
        } else {
          return (
            <>
              <Row style={{ paddingBottom: "10px" }}>
                <h3>Bridge</h3>
              </Row>
              <div style={{ paddingBottom: "20px", marginLeft: "0px" }}>
                <BridgeInfo
                  id={this.props.settings.bridge.id}
                  ip={this.props.settings.bridge.ip}
                  name={this.props.settings.bridge.name}
                  isButton={false}
                />
              </div>
              <h5>
                Button was not pressed in time
                <br />
                or bridge not found
              </h5>
              <Row style={{ paddingTop: "10px", marginLeft: "0px" }}>
                <Button variant="outline-info" style={{ width: "100px" }} onClick={this.handleTryAgain}>
                  Try Again
                </Button>
                &nbsp;&nbsp;
                <Button variant="danger" size="sm" style={{ width: "100px" }} onClick={this.handleGoBack}>
                  Cancel
                </Button>
              </Row>
            </>
          );
        }
      }
    } else {
      return (
        <>
          <Row>
            <h3>Bridge</h3>
          </Row>
          <div style={{ paddingBottom: "10px", marginLeft: "0px" }}>
            <BridgeInfo
              id={this.props.settings.bridge.id}
              ip={this.props.settings.bridge.ip}
              name={this.props.settings.bridge.name}
              isButton={false}
            />
          </div>
          <h5>
            <br />
            Lumunarr is linked to Hue Bridge
            <br />
            <br />
          </h5>
          <Row style={{ marginLeft: "0px" }}>
            <Button variant="outline-secondary" style={{ width: "150px" }} onClick={this.handleDelete}>
              Remove Bridge
            </Button>
          </Row>
        </>
      );
    }
  }
}
