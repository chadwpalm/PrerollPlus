import React from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

const Announce = ({ announce, fullscreenAnn, handleCloseAnn, handleDismiss, dismiss }) => {
  return (
    <Modal show={announce} fullscreen={fullscreenAnn} onHide={handleCloseAnn} size="lg" animation={true}>
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
          onChange={handleDismiss}
          size="sm"
          checked={dismiss}
        />
        <br />
        <br />
        <Button onClick={handleCloseAnn}>Dismiss</Button>
      </Modal.Body>
    </Modal>
  );
};

export default Announce;
