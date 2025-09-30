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
        <b>Major Update v1.2.0 - Keeping up with the Joneses!</b>
        <br />
        <br />
        It seems like some catching up was in order to keep up with other apps (or really one other app) that lets you
        manage prerolls for Plex, so there are two major changes that have been added to this release with the hope that
        managing prerolls can be a bit more powerful.
        <br />
        <br />
        <b>Change #1</b>
        <br />
        <br />
        A second source for holidays has been added which contains 100's more holidays to choose from. The reason for
        this is because the original source was limited to public/federal holidays so it didn't include non-public
        observed holidays such as Mother's Day, Valentines Day, Halloween, etc.
        <br />
        <br />
        I used the original source because it was completely free and did not require an API key to use. I've now
        included the ability to use the API from Calendarific. The catch is that Calendarific requires an account to
        obtain an API key for its use. The good news is that their free plan allows up to 500 API calls a month. I've
        implemented a caching system which downloads the calendars locally on the first call to the API so that calls to
        the online API can be reduced and you never hit the 500 maximum calls. This occurs on both the frontend UI and
        during webhooks when the Plex string is updated.
        <br />
        <br />
        The obtained API key will need to be entered into the settings page. You still have the ability to use the
        original (Legacy) API if you are averse to signing up for new online accounts, and if you do nothing then the
        app should still work as you had it set up.
        <br />
        <br />
        <b>Change #2</b>
        <br />
        <br />
        Priorities have now been added to Sequences. This means that schedules (and holidays) can now overlap and the
        sequence that is chosen during overlaps is the one with the higher priority (lower number, meaning 1 is the
        highest priority). There are 100 priority slots which should be plenty to play around with.
        <br />
        <br />
        This new priority system should allow you to schedule a month-long preroll sequence (for example) but still have
        a shorter schedule or holiday inside the month-long schedule and the schedule with the higher priority will be
        chosen for that day.
        <br />
        <br />
        There is just one rule enforced to still avoid conflicts: 1. No two schedules can have the same priority as the
        backend will not know which one to use if they fall on the same day.
        <br />
        <br />
        I've lifted the rule that there can only be one no-schedule sequence, but be aware that only the one with the
        highest priority will ever be used. It could be useful if you want to easily re-arrange priorities on them to
        choose which ones to use.
        <br />
        <br />
        As always, if you have any issues please{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/issues" target="_blank">
          create an issue on GitHub
        </a>
        , or if you simply have a question or want to discuss any features you and use the{" "}
        <a href="https://github.com/chadwpalm/PrerollPlus/discussions" target="_blank">
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
