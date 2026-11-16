import React, { useState, useRef, useEffect } from "react";
import Image from "react-bootstrap/Image";
import copyIcon from "bootstrap-icons/icons/copy.svg";
import subscribeIcon from "bootstrap-icons/icons/calendar-plus.svg";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { addMonths, format, getDaysInMonth, startOfYear } from "date-fns";
import "./Calendar.css";
import Form from "react-bootstrap/Form";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

const today = new Date();
const start = format(startOfYear(today), "yyyy-MM-dd");
const end = format(addMonths(startOfYear(today), 24), "yyyy-MM-dd");

// Phones get a month agenda instead of the month grid (sequence names don't fit in 7 narrow columns)
const NARROW_QUERY = "(max-width: 767.98px)";

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e) => setIsNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isNarrow;
}

const pad = (n) => String(n).padStart(2, "0");

/** Days of the month grouped into runs of the same sequence: [{ first, last, event }] (event null = none). */
function groupMonth(year, month, days) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const groups = [];
  const count = getDaysInMonth(new Date(year, month - 1, 1));
  for (let day = 1; day <= count; day++) {
    const event = byDate.get(`${year}-${pad(month)}-${pad(day)}`) ?? null;
    const last = groups[groups.length - 1];
    if (last && (last.event?.id ?? null) === (event?.id ?? null)) last.last = day;
    else groups.push({ first: day, last: day, event });
  }
  return groups;
}

/** Phone layout: month title with prev/next/today, then one row per run of days with the same sequence. */
function MonthAgenda({ year, month, days, isDarkMode, onMove, canPrev, canNext }) {
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const dayLabel = (day) => format(new Date(year, month - 1, day), "EEE, MMM d");
  const variant = isDarkMode ? "outline-light" : "outline-secondary";

  return (
    <div className={`month-agenda ${isDarkMode ? "dark" : ""}`}>
      <div className="agenda-toolbar">
        <Button variant={variant} size="sm" onClick={() => onMove(-1)} disabled={!canPrev} aria-label="Previous month">
          ‹
        </Button>
        <h5 className="agenda-title">{format(new Date(year, month - 1, 1), "MMMM yyyy")}</h5>
        <Button variant={variant} size="sm" onClick={() => onMove(1)} disabled={!canNext} aria-label="Next month">
          ›
        </Button>
        <Button variant={variant} size="sm" onClick={() => onMove(0)} disabled={isThisMonth}>
          Today
        </Button>
      </div>
      {groupMonth(year, month, days).map(({ first, last, event }) => {
        const isCurrent = isThisMonth && today.getDate() >= first && today.getDate() <= last;
        return (
          <div key={first} className={`agenda-item ${event ? "" : "agenda-empty"} ${isCurrent ? "agenda-today" : ""}`}>
            <div className="agenda-dates">
              {first === last ? dayLabel(first) : `${dayLabel(first)} – ${dayLabel(last)}`}
              {isCurrent && <span className="agenda-today-badge">Today</span>}
            </div>
            {event ? (
              <>
                <div className="agenda-sequence">{event.title}</div>
                {event.buckets?.length > 0 && (
                  <ol className="agenda-buckets">
                    {event.buckets.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ol>
                )}
              </>
            ) : (
              <div className="agenda-sequence">No sequence</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SequenceCalendar({ events, isDarkMode = false, settings }) {
  const [monthEvents, setMonthEvents] = useState([]);
  const [showICAL, setShowICAL] = useState(false);
  const [includeBuckets, setIncludeBuckets] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const currentMonthRef = useRef("");
  const feedInputRef = useRef(null);
  const isNarrow = useIsNarrow();
  // Month shown by the phone agenda (the desktop grid keeps its own date)
  const [agendaMonth, setAgendaMonth] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });

  const loadMonth = (year, month) => {
    const key = `${year}-${month}`;
    if (currentMonthRef.current === key) return;
    currentMonthRef.current = key;

    fetch(`webhook/calendar?year=${year}&month=${month}&_=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => setMonthEvents(data))
      .catch(() => setMonthEvents([]));
  };

  // Phone agenda navigation: -1 / +1 month, or 0 for this month. Same range as the grid's validRange.
  const firstMonth = startOfYear(today);
  const lastMonth = addMonths(firstMonth, 23);
  const agendaDate = new Date(agendaMonth.year, agendaMonth.month - 1, 1);
  const moveAgenda = (step) => {
    const next = step === 0 ? new Date(today.getFullYear(), today.getMonth(), 1) : addMonths(agendaDate, step);
    if (next < firstMonth || next > lastMonth) return;
    const year = next.getFullYear();
    const month = next.getMonth() + 1;
    setAgendaMonth({ year, month });
    loadMonth(year, month);
  };

  // Switching between phone and desktop layouts: load the month the new layout shows
  useEffect(() => {
    currentMonthRef.current = "";
    if (isNarrow) loadMonth(agendaMonth.year, agendaMonth.month);
    // the desktop grid loads its month through datesSet when it mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNarrow]);

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

  return (
    <>
      <div className={`calendar-header ${isDarkMode ? "dark" : ""}`}>
        <button type="button" className="ical-button" onClick={handleCalendarLink}>
          <svg
            className="ical-icon"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            {/* bootstrap-icons calendar-event-fill */}
            <path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4zM16 14V5H0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2m-3.5-7h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5" />
          </svg>
          <span className="ical-text">iCal Link</span>
        </button>
        {!isNarrow && <div className="hover-instruction">Hover over a Sequence name to view its buckets</div>}
      </div>
      {isNarrow ? (
        <MonthAgenda
          year={agendaMonth.year}
          month={agendaMonth.month}
          days={monthEvents}
          isDarkMode={isDarkMode}
          onMove={moveAgenda}
          canPrev={agendaDate > firstMonth}
          canNext={agendaDate < lastMonth}
        />
      ) : (
        <div className="calendar-wrapper" data-color-scheme={isDarkMode ? "dark" : "light"}>
          <FullCalendar
            plugins={[dayGridPlugin, classicThemePlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            height="auto"
            // FullCalendar 7 sizes rows from the aspect ratio even with height="auto", so rows grow with
            // the screen width. A large ratio disables that; row height comes from .calendar-day-row instead.
            aspectRatio={100}
            dayRowClass="calendar-day-row"
            dayHeaderClass="calendar-day-header"
            toolbarTitleClass="calendar-title"
            events={events}
            validRange={{ start, end }}
            firstDay={parseInt(settings.settings.dayOfWeek, 10) || 0}
            datesSet={(info) => {
              const currentDate = info.view.calendar.getDate();
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              loadMonth(year, month);
            }}
            dayCellTopContent={(arg) => {
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
                      // Dim days that belong to the previous/next month
                      opacity: arg.isOther ? 0.35 : 1,
                    }}
                  >
                    {arg.dayNumberText.replace(/\D/g, "")}
                  </div>

                  {/* Sequence title */}
                  {ev && (
                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                      <OverlayTrigger
                        placement="bottom"
                        overlay={
                          <Tooltip className={`bucket-tooltip ${isDarkMode ? "dark" : ""}`}>
                            {ev.buckets.map((name, i) => (
                              <div key={i}>
                                {i + 1}. {name}
                              </div>
                            ))}
                          </Tooltip>
                        }
                      >
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
                        >
                          {ev.title}
                        </div>
                      </OverlayTrigger>
                    </div>
                  )}
                </div>
              );
            }}
          />
        </div>
      )}
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
