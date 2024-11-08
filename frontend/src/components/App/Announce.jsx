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
        <b>Welcome to Preroll Plus v1.0.0!</b>
        <br />
        <br />
        Preroll Plus is now out of Beta!
        <br />
        <br />
        In this release we have added some new features. Logs are now written to files alongside console output. You can
        find them in the same directory as your config file. An option to choose between informational and debug logging
        is now in the Settings menu.
        <br />
        <br />
        Speaking of the Settings menu, the more advanced feature options are now hidden and can be revealed by clicking
        the Show Advanced button on the top right of the page.
        <br />
        <br />
        There are also some minor fixes in this release. If Plex Media Server settings are set to require secure
        connections, the server search was not able to grab the secure addresses from the Plex server. This has been
        fixed. Also, the dark/light mode setting was not being preserved when logging out. This has also been fixed.
        <br />
        <br />
        The holidays are here, so hopefully you are taking advantage of the scheduling options when creating Sequences.
        <br />
        <br />
        Happy Prerolling!
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
