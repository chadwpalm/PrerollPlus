import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { addMonths, startOfMonth, format, startOfYear } from "date-fns";
import "./Calendar.css";

const today = new Date();
const start = format(startOfYear(today), "yyyy-MM-dd");
const end = format(addMonths(startOfYear(today), 24), "yyyy-MM-dd");

export default function SequenceCalendar({ events, isDarkMode = false }) {
  const [monthEvents, setMonthEvents] = useState([]);
  const currentMonthRef = useRef("");

  const loadMonth = (year, month) => {
    const key = `${year}-${month}`;
    if (currentMonthRef.current === key) return;
    currentMonthRef.current = key;

    fetch(`/webhook/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setMonthEvents);
  };

  useEffect(() => {
    const now = new Date();
    loadMonth(now.getFullYear(), now.getMonth() + 1);
  }, []);

  return (
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

        // Always return a wrapper so we can position the number top-right
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
              {arg.dayNumberText.replace(/\D/g, "")} {/* removes "st", "nd", "rd", "th" */}
            </div>

            {/* Sequence title */}
            {ev && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "20px", // gives space for the number above
                  color: textColor,
                  fontWeight: 600,
                  fontSize: "13px",
                  background: bgColor,
                  borderRadius: "6px",
                  padding: "4px 8px",
                  display: "inline-block",
                }}
              >
                {ev.title}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
