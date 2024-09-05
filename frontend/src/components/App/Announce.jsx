import React, { Component } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

export default class Client extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Modal
        show={this.props.announce}
        fullscreen={this.props.fullscreenAnn}
        onHide={this.props.handleCloseAnn}
        size="lg"
        animation={true}
      >
        <Modal.Header>
          <Modal.Title>Announcement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <b>Welcome to Preroll Plus!</b>
          <br />
          <br />
          Preroll Plus is currently in Beta, so please feel free to submit any issues to{" "}
          <a href="https://github.com/chadwpalm/PrerollPlus/issues" target="_blank">
            https://github.com/chadwpalm/PrerollPlus/issues
          </a>{" "}
          or in the{" "}
          <a href="https://github.com/chadwpalm/PrerollPlus/discussions" target="_blank">
            Discussion
          </a>{" "}
          section of the GitHub repository.
          <br />
          <br />
          <Form.Check
            inline
            label="Do not show this message again"
            id="Dismiss"
            name="Dismiss"
            onChange={this.props.handleDismiss}
            size="sm"
            checked={this.props.dismiss}
          />
          <br />
          <br />
          <Button onClick={this.props.handleCloseAnn}>Dismiss</Button>
        </Modal.Body>
      </Modal>
    );
  }
}
