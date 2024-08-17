import React, { Component } from "react";
import Button from "react-bootstrap/Button";

export default class BridgeInfo extends Component {
  render() {
    const { name, id, ip, onActivate, isButton } = this.props;

    if (isButton) {
      return (
        <Button variant="outline-secondary" onClick={() => onActivate(name, id, ip)}>
          <div>Name: {name}</div>
          <div>ID: {id}</div>
          <div>IP: {ip}</div>
        </Button>
      );
    } else {
      return (
        <Button disabled variant="outline-secondary" style={{ textAlign: "left" }}>
          <div>Name: {name}</div>
          <div>ID: {id}</div>
          <div>IP: {ip}</div>
        </Button>
      );
    }
  }
}
