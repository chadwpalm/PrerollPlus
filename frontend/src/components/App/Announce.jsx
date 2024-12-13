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
        <b>Holiday Update v1.1.0</b>
        <br />
        <br />
        This version of Preroll Plus now supports adding holidays for sequence scheduling.
        <br />
        <br />
        Any holidays used for a schedule will take precedence over all other schedules. For example, if you have a
        schedule between 5/20 and 5/30, and you add the Memorial Day schedule (which falls on 5/26/25) the Memorial Day
        schedule will be active on that day overriding the other schedule.
        <br />
        <br />
        <b>Notes:</b>
        <br />
        <br />
        The holiday scheduling uses an online API (https://date.nager.at/) to get its information. This means two
        things:
        <br />
        <br />
        1. The schedule supports 121 countries, but you are limited to which public holidays the API provides.
        <br />
        2. Since the information is pulling from an online API, your instance of Preroll Plus must have access to the
        internet. This should not be a problem since Preroll Plus requires internet access to connect to your Plex
        account for retrieving Plex Servers in the settings.
        <br />
        <br />
        This particular API was chosen due to in not needing an API key and having no limitations on access. Perhaps
        some time in the future an API with more holidays can be found and used.
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
