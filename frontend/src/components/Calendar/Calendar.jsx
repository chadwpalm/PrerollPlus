import React, { useState, useRef, useEffect } from "react";
import Image from "react-bootstrap/Image";
import { ReactComponent as CalendarIcon } from "bootstrap-icons/icons/calendar-event-fill.svg";
import copyIcon from "bootstrap-icons/icons/copy.svg";
import subscribeIcon from "bootstrap-icons/icons/calendar-plus.svg";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { addMonths, format, startOfYear } from "date-fns";
import "./Calendar.css";
import Form from "react-bootstrap/Form";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

const today = new Date();
const start = format(startOfYear(today), "yyyy-MM-dd");
const end = format(addMonths(startOfYear(today), 24), "yyyy-MM-dd");

export default function SequenceCalendar({ events, isDarkMode = false, settings }) {
  const [monthEvents, setMonthEvents] = useState([]);
  const [showICAL, setShowICAL] = useState(false);
  const [includeBuckets, setIncludeBuckets] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const currentMonthRef = useRef("");
  const feedInputRef = useRef(null);

  const loadMonth = (year, month) => {
    const key = `${year}-${month}`;
    if (currentMonthRef.current === key) return;
    currentMonthRef.current = key;

    fetch(`webhook/calendar?year=${year}&month=${month}&_=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("Fresh data loaded:", year, month, data);
        setMonthEvents(data);
      });
  };

  const apiKey = settings?.mainApiKey ?? "";
  const basePath = window.__BASE_PATH__ || "/";
  const feedURL =
    `${window.location.origin}${basePath}feed/calendar/PrerollPlus.ics?apikey=${encodeURIComponent(apiKey)}` +
    (includeBuckets ? "&buckets=true" : "");
  const webcalURL = feedURL.replace(/^https?:\/\//, "webcal://");

  const handleCalendarLink = () => {
    setShowICAL(true);
  };

  const handleClose = () => {
    setShowICAL(false);
    setCopySuccess(false);
  };

  const handleCopy = () => {
    const showCopied = () => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    };

    // navigator.clipboard is only available in secure contexts (HTTPS or localhost)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(feedURL).then(showCopied);
      return;
    }

    const input = feedInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    try {
      if (document.execCommand("copy")) showCopied();
    } catch (err) {
      // Text stays selected so the user can copy it manually
    }
  };

  const handleIncludeBuckets = (e) => {
    setIncludeBuckets(e.target.checked);
  };

  useEffect(() => {
    const now = new Date();
    loadMonth(now.getFullYear(), now.getMonth() + 1);
  }, []);

  return (
    <>
      <div className={`calendar-header ${isDarkMode ? "dark" : ""}`}>
        <button type="button" className="ical-button" onClick={handleCalendarLink}>
          <CalendarIcon className="ical-icon" aria-hidden="true" />
          <span className="ical-text">iCal Link</span>
        </button>
        <div className="hover-instruction">Hover over a Sequence name to view its buckets</div>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        height="auto"
        events={events}
        validRange={{ start, end }}
        firstDay={parseInt(settings.settings.dayOfWeek, 10) || 0}
        datesSet={(info) => {
          const currentDate = info.view.calendar.getDate();
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          loadMonth(year, month);
        }}
        dayCellContent={(arg) => {
          const dateStr = arg.date.toISOString().split("T")[0];
          const ev = monthEvents.find((e) => e.date === dateStr);

          const dayNumberColor = isDarkMode ? "#ffffff" : "#000000";
          const textColor = isDarkMode ? "#e0e0e0" : "#000000";
          const bgColor = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";

          return (
            <div style={{ position: "relative", height: "100%", padding: "4px" }}>
              {/* Day number — top right */}
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: 6,
                  fontWeight: "bold",
                  color: dayNumberColor,
                  fontSize: "13px",
                  zIndex: 10,
                }}
              >
                {arg.dayNumberText.replace(/\D/g, "")}
              </div>

              {/* Sequence title */}
              {ev && (
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <div
                    style={{
                      background: bgColor,
                      color: textColor,
                      fontWeight: 600,
                      fontSize: "13px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      display: "inline-block",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      // Remove any existing tooltip
                      document.querySelectorAll(".bucket-tooltip").forEach((t) => t.remove());

                      const rect = e.currentTarget.getBoundingClientRect();
                      const tooltip = document.createElement("div");
                      tooltip.className = "bucket-tooltip";
                      tooltip.innerHTML = ev.buckets.map((name, i) => `${i + 1}. ${name}`).join("<br>");

                      Object.assign(tooltip.style, {
                        position: "fixed",
                        top: rect.bottom + 8 + "px",
                        left: rect.left + rect.width / 2 + "px",
                        transform: "translateX(-50%)",
                        background: isDarkMode ? "#1a1a1a" : "#ffffff",
                        color: isDarkMode ? "#eee" : "#222",
                        border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`,
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "13px",
                        fontWeight: "500",
                        zIndex: "999999",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                      });

                      document.body.appendChild(tooltip);
                    }}
                    onMouseLeave={() => {
                      document.querySelectorAll(".bucket-tooltip").forEach((t) => t.remove());
                    }}
                  >
                    {ev.title}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      />
      <Modal show={showICAL} onHide={handleClose} size="lg" className={isDarkMode ? "dark-mode" : ""}>
        <Modal.Header closeButton closeVariant={isDarkMode ? "white" : undefined}>
          <Modal.Title>Preroll Plus Calendar Feed</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className={`form-content ${isDarkMode ? "dark-mode" : ""}`} onSubmit={(e) => e.preventDefault()}>
            <Stack gap={3} direction="horizontal" className="mb-3 align-items-center">
              <Form.Label htmlFor="includeBuckets" className="mb-0">
                Include Buckets
              </Form.Label>
              <Form.Check
                className="ical-check"
                checked={includeBuckets}
                id="includeBuckets"
                name="includeBuckets"
                onChange={handleIncludeBuckets}
                type="checkbox"
              />
              <Form.Text className={`mt-0 ${isDarkMode ? "text-white" : "text-muted"}`}>
                Include the names of the buckets in the calendar feed description.
              </Form.Text>
            </Stack>
            <Stack direction="horizontal" gap={2}>
              <Form.Label htmlFor="icalFeed" className="mb-1">
                iCal Feed
              </Form.Label>
              {copySuccess && <span className="text-success mb-1">Copied!</span>}
            </Stack>
            {apiKey ? (
              <>
                <Stack direction="horizontal" gap={2}>
                  <Form.Control
                    ref={feedInputRef}
                    value={feedURL}
                    readOnly
                    id="icalFeed"
                    name="icalFeed"
                    size="sm"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    variant={isDarkMode ? "outline-light" : "outline-secondary"}
                    size="sm"
                    onClick={handleCopy}
                    className="ical-action-button d-flex align-items-center justify-content-center"
                    title="Copy to clipboard"
                  >
                    <Image src={copyIcon} className="ical-action-icon" />
                  </Button>
                  <Button
                    variant={isDarkMode ? "outline-light" : "outline-secondary"}
                    size="sm"
                    href={webcalURL}
                    className="ical-action-button d-flex align-items-center justify-content-center"
                    title="Subscribe"
                  >
                    <Image src={subscribeIcon} className="ical-action-icon" />
                  </Button>
                </Stack>
                <Form.Text className={isDarkMode ? "text-white" : "text-muted"}>
                  Copy this URL to your calendar client(s), or click Subscribe if your browser supports webcal.
                </Form.Text>
              </>
            ) : (
              <div className="text-danger">No API key found. Generate one under Settings &gt; Security first.</div>
            )}
            <div className="d-flex justify-content-end mt-4">
              <Button variant={isDarkMode ? "outline-light" : "secondary"} onClick={handleClose}>
                Close
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}
