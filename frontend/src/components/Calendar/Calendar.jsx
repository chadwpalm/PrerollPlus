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

    fetch(`/webhook/calendar?year=${year}&month=${month}&_=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("Fresh data loaded:", year, month, data);
        setMonthEvents(data);
      });
  };

  useEffect(() => {
    const now = new Date();
    loadMonth(now.getFullYear(), now.getMonth() + 1);
  }, []);

  return (
    <>
      <div
        style={{
          textAlign: "right",
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: "600",
          color: isDarkMode ? "#aaaaaa" : "#555555",
        }}
      >
        Hover over a Sequence name to view its buckets
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
    </>
  );
}
