// Small form building blocks shared by Settings, Create (bucket) and CreateSeq (sequence).
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";

/** A form label with an (i) tooltip. `tip` can be text or JSX. */
export function InfoLabel({ htmlFor, children, tip, className }) {
  return (
    <Form.Label htmlFor={htmlFor} className={className}>
      {children}
      {tip && (
        <OverlayTrigger placement="right" overlay={<Tooltip>{tip}</Tooltip>}>
          <img src={Info} className="image-info ms-2" alt="Info" />
        </OverlayTrigger>
      )}
    </Form.Label>
  );
}
