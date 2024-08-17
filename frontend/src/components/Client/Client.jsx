import React, { Component } from "react";
import Card from "react-bootstrap/Card";
import Xclose from "bootstrap-icons/icons/x-square.svg";
import Edit from "bootstrap-icons/icons/pencil-square.svg";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import "./Client.css";

export default class Client extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: "",
      active: true,
    };

    this.handleClick = this.handleClick.bind(this.props.id);
  }

  static getDerivedStateFromProps(props) {
    if (props.checked === undefined) {
      props.isChecked(true, props.id);
      return { id: props.id, active: true };
    } else {
      return { id: props.id, active: props.checked };
    }
  }

  handleClick = (e) => {
    this.props.click(e.currentTarget.value);
  };

  handleDelete = (e) => {
    this.props.delete(this.state.id);
  };

  handleCheck = (e) => {
    if (e.target.checked) {
      this.setState({ active: true });
    } else {
      this.setState({ active: false });
    }

    this.props.isChecked(e.target.checked, this.state.id);
  };

  render() {
    return (
      <Card
        style={{ width: "10rem", height: "14rem", backgroundColor: "#f8f9fa" }}
        className="text-center"
        border="dark"
      >
        <Card.Header
          className="border-bottom-0"
          style={{ backgroundColor: "#f8f9fa", padding: "5px", textAlign: "right" }}
        >
          {this.props.isEdit || this.props.isCreating ? (
            <img src={Xclose} alt="Close" />
          ) : (
            <img src={Xclose} onClick={this.handleDelete} style={{ cursor: "pointer" }} alt="Close" />
          )}
        </Card.Header>
        <Card.Subtitle
          className="d-flex align-items-center justify-content-center"
          style={{ height: "4rem", paddingLeft: "5px", paddingRight: "5px" }}
        >
          {this.props.client}
        </Card.Subtitle>
        <Card.Body style={{ padding: "5px", verticalAlign: "text-bottom" }}>
          <div style={{ fontSize: "0.8em" }}>
            <b>User</b>
          </div>
          <div style={{ fontSize: "0.9em", paddingBottom: "5px" }}>{this.props.user}</div>
          <div style={{ fontSize: "0.8em" }}>
            <b>Media</b>
          </div>
          <div style={{ fontSize: "0.9em" }}>
            {this.props.media === "cinemaTrailer"
              ? "Trailer"
              : this.props.media[0].toUpperCase() + this.props.media.substring(1)}
          </div>
        </Card.Body>
        <Card.Footer className="border-top-0" style={{ backgroundColor: "#f8f9fa", padding: "5px" }}>
          <Row>
            <Col>
              {this.props.isEdit || this.props.isCreating ? (
                <div style={{ textAlign: "left" }}>
                  <Form.Switch onChange={this.handleCheck} defaultChecked={this.state.active} disabled />
                </div>
              ) : (
                <div style={{ textAlign: "left" }}>
                  <Form.Switch onChange={this.handleCheck} defaultChecked={this.state.active} />
                </div>
              )}
            </Col>
            <Col>
              <div style={{ textAlign: "right" }}>
                {this.props.isEdit || this.props.isCreating ? (
                  <img src={Edit} alt="Edit" />
                ) : (
                  <button
                    value={this.state.id}
                    onClick={this.handleClick}
                    style={{ margin: 0, padding: 0, borderWidth: "0px", backgroundColor: "inherit" }}
                  >
                    <img src={Edit} alt="Edit" />
                  </button>
                )}
              </div>
            </Col>
          </Row>
        </Card.Footer>
      </Card>
    );
  }
}
