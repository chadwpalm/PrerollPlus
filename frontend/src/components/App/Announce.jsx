import React from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import "./App.css";

const Announce = ({ announce, fullscreenAnn, handleCloseAnn, handleDismiss, dismiss, isDarkMode }) => {
  return (
    <Modal
      show={announce}
      fullscreen={fullscreenAnn}
      onHide={handleCloseAnn}
      size="lg"
      animation={true}
      className={isDarkMode ? "dark-mode" : ""}
    >
      <Modal.Header>
        <Modal.Title>Announcement</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <b>Welcome to Preroll Plus!</b>
        <br />
        <br />
        Preroll Plus is currently in Beta, so please feel free to submit any issues to{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/issues" target="_blank" rel="noreferrer">
          https://github.com/chadwpalm/PrerollPlus/issues
        </a>{" "}
        or in the{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/discussions" target="_blank" rel="noreferrer">
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
        <Button variant={isDarkMode ? "secondary" : "primary"} onClick={handleCloseAnn}>
          Dismiss
        </Button>
      </Modal.Body>
    </Modal>
  );
};

export default Announce;
