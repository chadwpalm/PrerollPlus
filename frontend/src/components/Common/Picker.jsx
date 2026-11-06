// Two-list picker used by the bucket and sequence editors: the chosen items on the left,
// what you can add on the right, and an arrow button between them. Side by side on wider
// screens, stacked (chosen list on top, arrow pointing up) on phones.
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import ListGroup from "react-bootstrap/ListGroup";
import LeftArrow from "bootstrap-icons/icons/arrow-left.svg";
import "./Picker.css";

/** One list with a header (title on the left, optional buttons on the right). */
export function PickerPane({ title, toolbar, children }) {
  return (
    <div className="picker-pane">
      <div className="picker-header">
        <span className="picker-title">{title}</span>
        {toolbar && <div className="picker-toolbar">{toolbar}</div>}
      </div>
      <ListGroup variant="flush" className="picker-list div-font">
        {children}
      </ListGroup>
    </div>
  );
}

/** Chosen pane, "add" arrow, available pane. */
export function PickerLayout({ chosen, available, onAdd, addTitle, isDarkMode }) {
  return (
    <div className="picker-layout">
      {chosen}
      <div className="picker-add">
        <Button
          onClick={onAdd}
          variant={isDarkMode ? "outline-light" : "outline-secondary"}
          title={addTitle}
          aria-label={addTitle}
        >
          <Image src={LeftArrow} alt="" className="arrow-icon picker-add-icon" />
        </Button>
      </div>
      {available}
    </div>
  );
}
