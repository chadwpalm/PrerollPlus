import Card from "react-bootstrap/Card";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import "./SettingsSection.css";

export default function SettingsSection({ title, tooltip, children, isDarkMode }) {
  return (
    <Card className={`mb-4 settings-section ${isDarkMode ? "dark-mode" : ""}`}>
      <Card.Header className="d-flex align-items-center">
        <h5 className="mb-0">{title}</h5>
        {tooltip && (
          <OverlayTrigger placement="right" overlay={<Tooltip>{tooltip}</Tooltip>}>
            <img src={Info} className="image-info ms-2" alt="Info" />
          </OverlayTrigger>
        )}
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );
}
