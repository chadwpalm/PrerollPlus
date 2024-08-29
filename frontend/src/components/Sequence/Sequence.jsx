import React, { Component } from "react";
import Client from "../Client/Client";
import AddIcon from "../../images/add-icon.png";
import Create from "../Create/Create";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

export default class Device extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clients: [],
      isCreating: false,
      uid: "",
      isEdit: false,
      show: false,
      tempID: "",
    };
    this.state.clients = this.props.settings.clients;
  }

  handleAddClient = () => {
    this.setState({
      isCreating: true,
      isEdit: false,
    });
  };

  handleEditClient = (e) => {
    this.setState({
      isCreating: true,
      isEdit: true,
      uid: e,
    });
  };

  handleCancelCreate = () => {
    this.setState({ isCreating: false, isEdit: false });
  };

  handleSaveCreate = () => {
    this.setState({ isCreating: false, isEdit: false });
  };

  handleClose = () => this.setState({ show: false });

  handleOpen = (e) => {
    this.setState({ tempID: e });
    this.setState({ show: true, fullscreen: "md-down" });
  };

  handleDelete = (e) => {
    e.preventDefault();

    var settings = { ...this.props.settings };

    const index = settings.clients.findIndex(({ uid }) => uid === this.state.tempID);

    settings.clients.splice(index, 1);

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ show: false });
        } else {
          // error
          this.setState({
            show: false,
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));

    this.handleSaveCreate();
  };

  handleChecked = (checked, id) => {
    var settings = { ...this.props.settings };

    const index = settings.clients.findIndex(({ uid }) => uid === id);

    var client = settings.clients[index];
    client.active = checked;
    settings.clients.splice(index, 1, client);

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
        } else {
          // error
          this.setState({
            show: false,
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));
  };

  render() {
    return (
      <>
        <Row>
          <h3>Clients</h3>
        </Row>
        <Row xs={2} sm="auto">
          {this.state.clients?.map((client) => (
            <Col>
              <Client
                settings={this.props.settings}
                client={client.client.name}
                user={client.user.name}
                media={client.media}
                id={client.uid}
                click={this.handleEditClient}
                saved={this.handleSaveCreate}
                isEdit={this.state.isEdit}
                isCreating={this.state.isCreating}
                delete={this.handleOpen}
                checked={client.active}
                isChecked={this.handleChecked}
              />
              <br />
            </Col>
          ))}

          <Col>
            {this.state.isEdit || this.state.isCreating ? (
              <Card style={{ width: "10rem", height: "14rem", backgroundColor: "#f8f9fa" }}>
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <img src={AddIcon} width="100" height="100" />
                </Card.Body>
              </Card>
            ) : (
              <Card
                style={{ width: "10rem", height: "14rem", backgroundColor: "#f8f9fa", cursor: "pointer" }}
                onClick={this.handleAddClient}
              >
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <img src={AddIcon} width="100" height="100" />
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Row style={{ paddingLeft: "10px", paddingTop: "20px" }}>
          {this.state.isCreating ? (
            <Create
              settings={this.props.settings}
              cancel={this.handleCancelCreate}
              saved={this.handleSaveCreate}
              uid={this.state.uid}
              isEdit={this.state.isEdit}
              logout={this.props.logout}
            />
          ) : (
            <h6>Click the plus to add a new device.</h6>
          )}
        </Row>
        <Modal
          show={this.state.show}
          fullscreen={this.state.fullscreen}
          onHide={this.handleClose}
          size="sm"
          backdrop="static"
        >
          <Modal.Body>
            <h4> Are you sure?</h4>
            <Button onClick={this.handleDelete}>Yes</Button>&nbsp;&nbsp;&nbsp;
            <Button variant="" onClick={this.handleClose}>
              Cancel
            </Button>
          </Modal.Body>
        </Modal>
      </>
    );
  }
}
