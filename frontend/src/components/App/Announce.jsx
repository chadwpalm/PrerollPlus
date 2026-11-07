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
        <b>Preroll Plus v1.6.0 Update</b>
        <br />
        <br />
        This one started as a quick security update and, well, got a little out of hand. Preroll Plus got a fresh coat
        of paint and a brand new engine under the hood.
        <ul>
          <li>
            <b>Only you can sign in.</b> Signing in with Plex used to let any Plex account in. Now only the account that
            set up Preroll Plus can sign in, and each browser stays signed in on its own. If you'd rather not sign in at
            home, go to Settings &gt; Security &gt; Authentication and choose "Not required for local addresses".
          </li>
          <li>
            <b>A new look for your sequences and buckets.</b> The create and edit pages are now organized into tidy
            sections, and the file and bucket lists stretch to use your whole screen.
          </li>
          <li>
            <b>Phone friendly.</b> The Sequence and Bucket cards line up neatly on your phone now (no more overlapping
            cards), and the editors stack nicely on small screens.
          </li>
          <li>
            <b>A calendar you can read on the go.</b> On your phone, the Calendar now shows a simple list of which
            sequence plays when, along with its buckets. No more squinting at tiny boxes.
          </li>
          <li>
            <b>"Why is this sequence playing?"</b> Preroll Plus now tells you. Set the log level to Debug under Settings
            &gt; Show Advanced &gt; Logging and the logs will walk through how every sequence was checked against today.
          </li>
          <li>
            <b>A smarter Host section.</b> Settings now shows the port and URL base Preroll Plus is actually running on,
            and lets you know when a Docker environment variable is in charge.
          </li>
          <li>
            <b>Fresh and secure.</b> Everything under the hood has been updated to the latest versions, with zero known
            security vulnerabilities. You won't see most of it, but your Docker image will thank you (it's smaller,
            too).
          </li>
        </ul>
        A few bugs were squashed along the way as well. For the full (and much nerdier) list of changes, check out the{" "}
        <a href="https://prerollplus.org/changelog" target="_blank" rel="noreferrer">
          changelog
        </a>
        .
        <br />
        <br />
        As always, thank you for your support on this project, and I hope you enjoy the new look!
        <br />
        <br />
        If you run into any issues please{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/issues" target="_blank" rel="noreferrer">
          create an issue on GitHub
        </a>
        , or if you have a question or want to talk about features, stop by the{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/discussions" target="_blank" rel="noreferrer">
          discussion board
        </a>{" "}
        or the{" "}
        <a href="https://discord.gg/sXse6H8fMF" target="_blank" rel="noreferrer">
          Discord server
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
