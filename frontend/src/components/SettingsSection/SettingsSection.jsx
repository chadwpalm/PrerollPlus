import React from "react";
import Card from "react-bootstrap/Card";
import "./SettingsSection.css";

export default function SettingsSection({ title, icon, children, isDarkMode }) {
  return (
    <Card className={`mb-4 settings-section ${isDarkMode ? "dark-mode" : ""}`}>
      <Card.Header className="d-flex align-items-center">
        {icon && <span className="me-2">{icon}</span>}
        <h5 className="mb-0">{title}</h5>
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );
}
