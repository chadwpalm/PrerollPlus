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
        <b>Update v1.4.0</b>
        <br />
        <br />
        This update focuses a lot on much needed backend improvements, including updating the Node version to 20 LTS in
        the Docker images after sitting on an old unsupported version for far too long. The 3rd party API which I was
        using for Plex has been removed due to being unmaintained and replaced with native and up to date code.
        <br />
        <br />
        Logging has been greatly improved with more detailed debug logging for troubleshooting issues. Also, several new
        features have been added for more customizable features which I won't cover here, but can be reviewed in the{" "}
        <a href="https://prerollplus.org/changelog" target="_blank" rel="noreferrer">
          Changelog
        </a>
        <br />
        <br />
        Most importantly, all documentation has now been moved from the GitHub wiki over to a new website called{" "}
        <a href="https://prerollplus.org" target="_blank" rel="noreferrer">
          prerollplus.org
        </a>
        <br />
        <br />
        As always, if you have any issues please{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/issues" target="_blank" rel="noreferrer">
          create an issue on GitHub
        </a>
        , or if you simply have a question or want to discuss any features you and use the{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/discussions" target="_blank" rel="noreferrer">
          discussion board
        </a>
        .
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
