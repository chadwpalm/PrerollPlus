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
        <b>Major Update v1.3.0 - What are my Sequences?</b>
        <br />
        <br />
        One thought occurred to me recently when a Preroll Plus user submitted a request: they wanted to see exactly
        which files were being sent to Plex for the current sequence. That thought was, “Why haven’t I thought of this
        sooner?”
        <br />
        <br />
        It wasn’t so much about knowing the exact files being played, but about being able to see at a glance which
        sequence was active. So I added two new elements to Preroll Plus that do just that!
        <br />
        <br />
        The first is simple: a blue border now appears around the sequence that is being used for that day. Now, with
        one quick look, you can instantly see which sequence is active at any given moment.
        <br />
        <br />
        I decided to take it a step further and add a calendar page that shows which sequence will play on each day of
        the month. Just open the Calendar page and you’ll see a calendar for the current month, with each day clearly
        labeled with the sequence that will be used — based on your schedules and priorities. This lets you verify in
        advance whether your schedules and priorities are working the way you intend, eliminating guesswork or having to
        wait for the day to arrive. You can also step through the months for the current year and the upcoming year.
        <br />
        <br />
        <b>Major Bug Fix</b>
        <br />
        <br />
        It’s actually a good thing I went through the exercise of adding the calendar, because it revealed a bug in the
        code that would have prevented the correct holiday dates for 2026 from working — the app would have kept using
        2025’s dates instead. This is now fixed.
        <br />
        <br />
        We’ve come a long way with Preroll Plus, and I’m excited for whatever features come next!
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
