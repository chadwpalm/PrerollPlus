import React, { Component, createRef } from "react";
import { v4 as uuid } from "uuid";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Stack from "react-bootstrap/Stack";
import UpArrow from "bootstrap-icons/icons/arrow-up.svg";
import LeftArrow from "bootstrap-icons/icons/arrow-left.svg";
import DownArrow from "bootstrap-icons/icons/arrow-down.svg";
import DownArrowShort from "bootstrap-icons/icons/arrow-down-short.svg";
import Modal from "react-bootstrap/Modal";

export default class Create extends Component {
  constructor(props) {
    super(props);

    if (this.props.isEdit) {
      var info = this.props.settings.sequences.find(({ id }) => id === this.props.id.toString());

      this.state = {
        id: info.id,
        name: info.name,
        startMonth: info.startMonth,
        startDay: info.startDay,
        endMonth: info.endMonth,
        endDay: info.endDay,
        schedule: info.schedule,
        buckets: info.buckets.map((bucket) => ({ ...bucket, uid: uuid() })),
        selectedBucket: {},
        selectedSequence: {},
        isError: false,
        isSaved: false,
        isIncomplete: false,
        show: false,
        showOverlapWarning: false,
      };
    } else {
      this.state = {
        name: "",
        startMonth: "1",
        startDay: "1",
        endMonth: "1",
        endDay: "1",
        schedule: "2",
        buckets: [],
        selectedBucket: {},
        selectedSequence: {},
        isError: false,
        isSaved: false,
        isIncomplete: false,
        show: false,
        showOverlapWarning: false,
      };
    }

    this.handleFormSubmit = this.handleFormSubmit.bind(this);

    this.monthList = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  }

  handleDate = (e) => {
    this.setState({ [e.target.name]: e.target.value.toString() });
  };

  handleSchedule = (e) => {
    this.setState({ schedule: e.target.value.toString() });
  };

  handleClickBuckets = (e) => {
    const target = e.currentTarget;
    var temp = JSON.parse(target.value);
    console.log(temp);

    this.setState({ selectedSequence: temp });
  };

  handleClick = (e) => {
    const target = e.currentTarget;
    var temp = JSON.parse(target.value);

    this.setState({ selectedBucket: temp });
  };

  handleAdd = () => {
    // Check if selectedBucket is not undefined and has at least one key
    if (this.state.selectedBucket && Object.keys(this.state.selectedBucket).length > 0) {
      this.setState((prevState) => ({
        buckets: [
          ...prevState.buckets,
          { id: this.state.selectedBucket.id, uid: uuid() }, // Add the object if valid
        ],
      }));
    }
  };

  handleRemove = () => {
    this.setState((prevState) => {
      const newBuckets = [...prevState.buckets]; // Create a copy of the current media state

      const index = newBuckets.findIndex((item) => item.uid === this.state.selectedSequence.uid); // Find the index of the first matching element
      if (index !== -1) {
        newBuckets.splice(index, 1); // Remove the first matching element
      }

      return { buckets: newBuckets, selectedSequence: {} }; // Update state with the modified media array and clear selectedFileList
    });
  };

  handleMoveUp = () => {
    this.setState((prevState) => {
      const newBuckets = [...prevState.buckets];
      const index = newBuckets.findIndex((item) => item.uid === this.state.selectedSequence.uid);

      // Check if index is valid and not at the start
      if (index <= 0 || index >= newBuckets.length) {
        console.error("Invalid index or element is already at the start.");
        return newBuckets;
      }

      // Swap elements
      [newBuckets[index - 1], newBuckets[index]] = [newBuckets[index], newBuckets[index - 1]];

      return { buckets: newBuckets };
    });
  };

  handleMoveDown = () => {
    this.setState((prevState) => {
      const newBuckets = [...prevState.buckets];
      const index = newBuckets.findIndex((item) => item.uid === this.state.selectedSequence.uid);

      // Check if index is valid and not at the start
      if (index === -1 || index >= newBuckets.length - 1) {
        console.error("Invalid index or element is already at the start.");
        return newBuckets;
      }

      // Swap elements
      [newBuckets[index], newBuckets[index + 1]] = [newBuckets[index + 1], newBuckets[index]];

      return { buckets: newBuckets };
    });
  };

  handleName = (e) => {
    this.setState({ name: e.target.value.toString(), isSaved: false });
  };

  handleFormSubmit = async (e) => {
    e.preventDefault();

    this.setState({ isIncomplete: false });

    if (this.state.name === "" || this.state.buckets.length === 0) {
      this.setState({ isIncomplete: true });
      return;
    }

    // Check for a "no schedule" condition (schedule === "2") within other sequences
    if (
      this.state.schedule === "2" &&
      this.props.settings.sequences
        .filter((element) => element.id !== this.state.id)
        .findIndex(({ schedule }) => schedule === "2") !== -1
    ) {
      this.setState({ show: true });
      return;
    }

    const settings = { ...this.props.settings };

    if (!settings.sequences) settings.sequences = [];

    const temp = {
      id: this.props.isEdit ? this.state.id : uuid().toString(),
      name: this.state.name,
      schedule: this.state.schedule,
      startDay: this.state.startDay,
      startMonth: this.state.startMonth,
      endDay: this.state.endDay,
      endMonth: this.state.endMonth,
      buckets: this.state.buckets.map(({ uid, ...rest }) => rest),
    };

    // Improved overlap detection
    const isOverlap = (start1, end1, start2, end2) => {
      const dateToNumber = (month, day) => new Date(2024, month - 1, day).getTime();

      const [start1Num, end1Num] = [dateToNumber(start1.month, start1.day), dateToNumber(end1.month, end1.day)];
      const [start2Num, end2Num] = [dateToNumber(start2.month, start2.day), dateToNumber(end2.month, end2.day)];

      const isWrapped1 = start1Num > end1Num;
      const isWrapped2 = start2Num > end2Num;

      if (isWrapped1 && isWrapped2) {
        return true;
      } else if (isWrapped1) {
        return start1Num <= end2Num || end1Num >= start2Num || (start1Num <= end2Num && end1Num >= start2Num);
      } else if (isWrapped2) {
        return start2Num <= end1Num || end2Num >= start1Num || (start2Num <= end1Num && end2Num >= start1Num);
      } else {
        return start1Num <= end2Num && end1Num >= start2Num;
      }
    };

    // Check for overlap with existing sequences, excluding itself
    const newStart = { month: temp.startMonth, day: temp.startDay };
    const newEnd = { month: temp.endMonth, day: temp.endDay };

    const overlapFound = settings.sequences
      .filter(({ id, schedule }) => id !== temp.id && schedule !== "2") // Exclude the current sequence by ID
      .some(({ startMonth, startDay, endMonth, endDay }) => {
        if (this.state.schedule === "1") {
          const existingStart = { month: startMonth, day: startDay };
          const existingEnd = { month: endMonth, day: endDay };
          return isOverlap(newStart, newEnd, existingStart, existingEnd);
        }
        return false;
      });

    if (overlapFound) {
      this.setState({ showOverlapWarning: true });
      return;
    }

    if (this.props.isEdit) {
      const index = settings.sequences.findIndex(({ id }) => id === this.state.id);
      settings.sequences.splice(index, 1, temp);
    } else {
      settings.sequences.push(temp);
    }

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({ isSaved: true });
          var xhr2 = new XMLHttpRequest();
          xhr2.addEventListener("readystatechange", () => {
            if (xhr2.readyState === 4) {
              if (xhr2.status === 200) {
              } else {
                this.setState({
                  error: xhr2.responseText,
                });
              }
            }
          });

          xhr2.open("GET", "/webhook", true);
          xhr2.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          xhr2.send();
        } else {
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(settings));

    this.props.saved();
  };

  handleClose = () => this.setState({ show: false });

  handleCloseOverlap = () => this.setState({ showOverlapWarning: false });

  render() {
    const startMonths = [];
    const startDays = [];
    const endMonths = [];
    const endDays = [];
    for (var i = 1; i <= 12; i++) {
      startMonths.push(
        <option value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>
      );
      endMonths.push(
        <option value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>
      );
    }
    for (var i = 1; i <= this.monthList[this.state.startMonth]; i++) {
      startDays.push(
        <option value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>
      );
    }
    for (var i = 1; i <= this.monthList[this.state.endMonth]; i++) {
      endDays.push(
        <option value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>
      );
    }

    return (
      <div>
        <Form.Label for="name">Name of sequence &nbsp;&nbsp;</Form.Label>
        <Form.Control value={this.state.name} id="name" name="name" onChange={this.handleName} size="sm" />
        <div style={{ paddingBottom: "0.75rem" }} />
        <Form.Label for="schedule">Schedule</Form.Label>
        <div>
          <Form.Check
            inline
            type="radio"
            label="Yes"
            value="1"
            id="schedule"
            name="schedule"
            onChange={this.handleSchedule}
            size="sm"
            checked={this.state.schedule === "1"}
          />
          <Form.Check
            inline
            type="radio"
            label="No"
            value="2"
            id="schedule"
            name="schedule"
            onChange={this.handleSchedule}
            size="sm"
            checked={this.state.schedule === "2"}
          />
        </div>
        <div style={{ paddingBottom: "0.75rem" }} />
        {this.state.schedule === "1" ? (
          <>
            <Stack gap={1} direction="horizontal">
              Start Date:&nbsp;&nbsp;
              <Form.Select
                value={this.state.startMonth}
                id="startMonth"
                name="startMonth"
                onChange={this.handleDate}
                size="sm"
                style={{ width: "65px" }}
              >
                {startMonths}
              </Form.Select>
              <Form.Select
                value={this.state.startDay}
                id="startDay"
                name="startDay"
                onChange={this.handleDate}
                size="sm"
                style={{ width: "65px" }}
              >
                {startDays}
              </Form.Select>
            </Stack>
            <div style={{ paddingBottom: "0.75rem" }} />
            <Stack gap={1} direction="horizontal">
              End Date:&nbsp;&nbsp;
              <Form.Select
                value={this.state.endMonth}
                id="endMonth"
                name="endMonth"
                onChange={this.handleDate}
                size="sm"
                style={{ width: "65px" }}
              >
                {endMonths}
              </Form.Select>
              <Form.Select
                value={this.state.endDay}
                id="endDay"
                name="endDay"
                onChange={this.handleDate}
                size="sm"
                style={{ width: "65px" }}
              >
                {endDays}
              </Form.Select>
            </Stack>
            <div style={{ paddingBottom: "0.75rem" }} />
          </>
        ) : (
          <></>
        )}
        <Row xs={1} sm="auto">
          <Col xs="auto">
            {/* File Listing */}
            <div style={{ fontSize: "12px" }}>
              <Card style={{ width: "22rem", backgroundColor: "#ffffff", borderRadius: "0" }}>
                <Card.Title className="m-0 p-2">
                  <ListGroup.Item style={{ fontSize: "14px" }} variant="light">
                    Bucket Sequence
                  </ListGroup.Item>
                </Card.Title>
                <Card.Body className="m-0 p-0" style={{ height: "500px", overflowY: "auto", margin: false }}>
                  <ListGroup variant="flush">
                    {this.state.buckets.length === 0 ? (
                      <ListGroup.Item>&lt;Add Buckets Here&gt;</ListGroup.Item>
                    ) : (
                      this.state.buckets.map((bucket, idx) => (
                        <React.Fragment key={bucket.uid}>
                          {idx !== 0 && (
                            <ListGroup.Item style={{ height: "25%", padding: "2px", border: "bottom" }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  height: "100%",
                                }}
                              >
                                <img src={DownArrowShort} alt="Down Arrow" />
                              </div>
                            </ListGroup.Item>
                          )}
                          {this.state.selectedSequence.uid === bucket.uid ? (
                            <ListGroup.Item
                              value={JSON.stringify(bucket)}
                              action
                              active
                              onClick={this.handleClickBuckets}
                              className="d-flex justify-content-between"
                              style={{ border: "none" }}
                            >
                              {this.props.settings.buckets.find(({ id }) => id === bucket.id.toString()).name}
                            </ListGroup.Item>
                          ) : (
                            <ListGroup.Item
                              value={JSON.stringify(bucket)}
                              action
                              onClick={this.handleClickBuckets}
                              className="d-flex justify-content-between"
                              style={{ border: "none" }}
                            >
                              {this.props.settings.buckets.find(({ id }) => id === bucket.id.toString()).name}
                            </ListGroup.Item>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
            <div style={{ paddingBottom: "0.75rem" }} />
            <Button onClick={this.handleRemove} type="submit" variant="light">
              Remove
            </Button>
            &nbsp;&nbsp;
            <Button onClick={this.handleMoveUp} variant="light">
              <img src={UpArrow} alt="UpArrow" />
            </Button>
            &nbsp;&nbsp;
            <Button onClick={this.handleMoveDown} variant="light">
              <img src={DownArrow} alt="DownArrow" />
            </Button>
            <div style={{ paddingBottom: "0.75rem" }} />
          </Col>
          <Col xs="auto" className="d-flex align-items-center justify-content-center">
            <Button onClick={this.handleAdd} variant="light">
              <img src={LeftArrow} alt="UpArrow" />
            </Button>
            <div style={{ paddingBottom: "0.75rem" }} />
          </Col>
          <Col xs="auto">
            {/* Bucket Listing */}
            <div style={{ fontSize: "12px" }}>
              <Card style={{ width: "22rem", backgroundColor: "#ffffff", borderRadius: "0" }}>
                <Card.Title className="m-0 p-2">
                  <ListGroup.Item style={{ fontSize: "14px" }} variant="light">
                    List of Buckets
                  </ListGroup.Item>
                </Card.Title>
                <Card.Body className="m-0 p-0" style={{ height: "500px", overflowY: "auto", margin: false }}>
                  <ListGroup variant="flush">
                    {this.props.settings.buckets
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((bucket) =>
                        this.state.selectedBucket.id === bucket.id ? (
                          <ListGroup.Item
                            key={bucket.id}
                            value={JSON.stringify(bucket)}
                            action
                            active
                            onClick={this.handleClick}
                          >
                            {bucket.name}
                          </ListGroup.Item>
                        ) : (
                          <ListGroup.Item
                            key={bucket.id}
                            value={JSON.stringify(bucket)}
                            action
                            onClick={this.handleClick}
                          >
                            {bucket.name}
                          </ListGroup.Item>
                        )
                      )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
            <div style={{ paddingBottom: "0.75rem" }} />
          </Col>
        </Row>
        <Button onClick={this.props.cancel} variant="light">
          Cancel
        </Button>
        &nbsp;&nbsp;
        {this.props.isEdit ? (
          <Button type="submit" variant="secondary" onClick={this.handleFormSubmit}>
            Update
          </Button>
        ) : (
          <Button type="submit" variant="secondary" onClick={this.handleFormSubmit}>
            Save
          </Button>
        )}
        &nbsp;&nbsp;
        {this.state.isIncomplete ? (
          <i style={{ color: "#f00" }}>
            &nbsp; There must be at least one item in the list and a sequence name must be filled.
          </i>
        ) : (
          <></>
        )}
        {this.state.isSaved ? <i style={{ color: "#00a700" }}>&nbsp; Settings saved. </i> : <></>}
        <div style={{ paddingBottom: "0.75rem" }} />
        <Modal show={this.state.show} onHide={this.handleClose} size="sm" backdrop="static">
          <Modal.Header>
            <h3>Error</h3>
          </Modal.Header>
          <Modal.Body>
            There cannot be more than one sequence that is set to "no schedule". This would cause conflicts in Preroll
            Plus choosing which sequence to use.
            <br />
            <br />
            See Preroll Plus documentation for more information.
            <br />
            <br />
            <Button onClick={this.handleClose}>Acknowledge</Button>
          </Modal.Body>
        </Modal>
        <Modal show={this.state.showOverlapWarning} onHide={this.handleCloseOverlap} size="sm" backdrop="static">
          <Modal.Header>
            <h3>Error</h3>
          </Modal.Header>
          <Modal.Body>
            To prevent conflicts, two sequences cannot overlap each other.
            <br />
            <br />
            See Preroll Plus documentation for more information.
            <br />
            <br />
            <Button onClick={this.handleCloseOverlap}>Acknowledge</Button>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}
