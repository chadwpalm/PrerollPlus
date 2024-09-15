import React, { Component } from "react";
import Card from "react-bootstrap/Card";
import Xclose from "bootstrap-icons/icons/x-square.svg";
import Edit from "bootstrap-icons/icons/pencil-square.svg";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import "./Bucket.css";

export default class Bucket extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: "",
      name: "",
      active: true,
    };

    this.state.id = this.props.id;
    this.state.name = this.props.bucket;
    this.handleClick = this.handleClick.bind(this.props.id);
  }

  handleClick = (e) => {
    this.props.click(e.currentTarget.value);
  };

  handleDelete = () => {
    this.props.delete(this.state.id);
  };

  render() {
    return (
      <Card
        style={{
          width: "10rem",
          height: "8rem",
          backgroundColor: "#f8f9fa",
          border:
            (this.props.isEdit || this.props.isCreating) && this.props.id === this.props.stateId
              ? "2px solid red"
              : "1px solid transparent",
        }}
        className="text-center"
        border={(this.props.isEdit || this.props.isCreating) && this.props.id === this.props.stateId ? "none" : "dark"}
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
          {this.state.name}
        </Card.Subtitle>
        <Card.Footer className="border-top-0" style={{ backgroundColor: "#f8f9fa", padding: "5px" }}>
          <Row>
            <Col></Col>
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
