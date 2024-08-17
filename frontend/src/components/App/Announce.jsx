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
          <b>Lumunarr v1.4.4 Update</b>
          <br />
          <br />
          <b>Fix:</b>
          <br />
          <br />
          This updated adds a "Default" option to the scene transtion time (slider far left). This will prevent Lumunarr
          from overriding the scene transition time saved in the scene. If no transition time is saved in the scene it
          will use Hue's default time of 0.4 seconds. Newly created scenes will now default to the "Default" setting
          both locally and globally*.
          <br />
          <br />
          * Only globally on first startup. Any existing global times will not change.
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
