import React, { Component } from "react";
import Card from "react-bootstrap/Card";
import Xclose from "bootstrap-icons/icons/x-square.svg";
import Edit from "bootstrap-icons/icons/pencil-square.svg";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import "./Sequence.css";

export default class Sequence extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: "",
      name: "",
      active: true,
    };

    this.state.id = this.props.id;
    this.state.name = this.props.sequence;
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
        className={`card-global ${
          (this.props.isEdit || this.props.isCreating) && this.props.id === this.props.stateId
            ? "card-error"
            : "card-default"
        } ${this.props.isDarkMode ? "dark-mode" : ""}`}
        border={(this.props.isEdit || this.props.isCreating) && this.props.id === this.props.stateId ? "none" : "dark"}
      >
        <Card.Header className={`border-bottom-0 header-custom ${this.props.isDarkMode ? "dark-mode" : ""}`}>
          {this.props.isEdit || this.props.isCreating ? (
            <Image src={Xclose} alt="Close" className="icon-noclick" />
          ) : (
            <Image src={Xclose} onClick={this.handleDelete} className="icon-clickable" alt="Close" />
          )}
        </Card.Header>
        <Card.Subtitle className="d-flex align-items-center justify-content-center sub-custom">
          {this.state.name}
        </Card.Subtitle>
        <Card.Footer className={`border-top-0 footer-custom ${this.props.isDarkMode ? "dark-mode" : ""}`}>
          <Row>
            <Col xs={9}>
              <div className="div-custom">
                {this.props.schedule === "2" ? (
                  <>No Schedule</>
                ) : this.props.schedule === "3" ? (
                  <>{this.props.holiday}</>
                ) : (
                  <>
                    {this.props.startMonth}/{this.props.startDay} - {this.props.endMonth}/{this.props.endDay}
                  </>
                )}
              </div>
            </Col>
            <Col xs={3}>
              <div style={{ textAlign: "right" }}>
                {this.props.isEdit || this.props.isCreating ? (
                  <Image src={Edit} alt="Edit" className="icon-noclick" />
                ) : (
                  <button value={this.state.id} onClick={this.handleClick} className="edit-button">
                    <Image src={Edit} alt="Edit" className="icon-clickable" />
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
