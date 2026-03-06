import React, { Component } from "react";
import Card from "react-bootstrap/Card";
import Xclose from "bootstrap-icons/icons/x-square.svg";
import Edit from "bootstrap-icons/icons/pencil-square.svg";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import "./Sequence.css";

const DAYS = {
  M: 1 << 0,
  T: 1 << 1,
  W: 1 << 2,
  Th: 1 << 3,
  F: 1 << 4,
  Sa: 1 << 5,
  Su: 1 << 6,
};

const DAY_LABELS = ["M", "T", "W", "Th", "F", "Sa", "Su"];

export default class Sequence extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: "",
      active: true,
    };

    this.state.id = this.props.id;
    this.handleClick = this.handleClick.bind(this.props.id);
  }

  handleClick = (e) => {
    this.props.click(e.currentTarget.value);
  };

  handleDelete = () => {
    this.props.delete(this.state.id);
  };

  getDaysDisplayText() {
    const { days } = this.props;

    if (days === 127) {
      return "Everyday";
    }

    if (days === 31) {
      return "Weekdays";
    }

    if (days === 96) {
      return "Weekends";
    }

    return DAY_LABELS.filter((label) => (days & DAYS[label]) !== 0).join(", ");
  }

  render() {
    return (
      <Card
        className={`card-global ${
          (this.props.isEdit || this.props.isCreating) && this.props.id === this.props.stateId
            ? "card-error"
            : this.props.id === this.props.currentSeq
              ? "card-current"
              : "card-default"
        } ${this.props.isDarkMode ? "dark-mode" : ""}`}
        border={
          (this.props.isEdit || this.props.isCreating) && this.props.id === this.props.currentSeq ? "none" : "dark"
        }
      >
        <Card.Header className={`border-bottom-0 header-custom ${this.props.isDarkMode ? "dark-mode" : ""}`}>
          <Row>
            <Col xs={9}>
              <div className="div-custom">Priority: {this.props.priority || "N/A"}</div>
            </Col>
            <Col xs={3}>
              {" "}
              {this.props.isEdit || this.props.isCreating ? (
                <Image src={Xclose} alt="Close" className="icon-noclick" />
              ) : (
                <Image src={Xclose} onClick={this.handleDelete} className="icon-clickable" alt="Close" />
              )}
            </Col>
          </Row>
        </Card.Header>
        <Card.Subtitle className="d-flex align-items-center justify-content-center sub-custom">
          {this.props.sequence}
        </Card.Subtitle>
        <Card.Footer className={`border-top-0 footer-custom ${this.props.isDarkMode ? "dark-mode" : ""}`}>
          <Row>
            <Col xs={9}>
              <div className="div-custom">
                {this.props.schedule === "2" ? (
                  <>No Schedule</>
                ) : this.props.schedule === "3" ? (
                  <>{this.props.holiday}</>
                ) : this.props.schedule === "4" ? (
                  this.getDaysDisplayText()
                ) : (
                  <>
                    {new Intl.DateTimeFormat(undefined, {
                      day: "2-digit",
                      month: "2-digit",
                    }).format(new Date(2023, this.props.startMonth - 1, this.props.startDay))}
                    {" - "}
                    {new Intl.DateTimeFormat(undefined, {
                      day: "2-digit",
                      month: "2-digit",
                    }).format(new Date(2023, this.props.endMonth - 1, this.props.endDay))}
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
