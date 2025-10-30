import React, { Component } from "react";
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
import SortName from "bootstrap-icons/icons/sort-alpha-down.svg";
import SortDate from "bootstrap-icons/icons/sort-numeric-down.svg";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Info from "bootstrap-icons/icons/info-circle.svg";
import Loading from "../../images/loading-gif.gif";
import { countryNames, countryCodes, countryNamesCalrific, countryCodesCalrific } from "./countries";
import "./CreateSeq.css";

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
        country: info.country ?? "US",
        holiday: info.holiday,
        holidaySource: info.holidaySource ?? "1",
        states: info.states ?? "",
        type: info.type ?? "1",
        holidayDate: info.holidayDate ?? "",
        holidayList: [],
        buckets: info.buckets.map((bucket) => ({ ...bucket, uid: uuid() })),
        priority: info.priority ?? "1",
        selectedBucket: {},
        selectedSequence: {},
        isError: false,
        isSaved: false,
        isIncomplete: false,
        isIncompleteHoliday: false,
        show: false,
        showOverlapWarning: false,
        sortOrder: "1",
        apiMissing: false,
        isLoading: false,
      };
    } else {
      this.state = {
        name: "",
        startMonth: "1",
        startDay: "1",
        endMonth: "1",
        endDay: "1",
        schedule: "2",
        country: "US",
        holiday: "-1",
        holidaySource: "1",
        states: "",
        type: "1",
        holidayDate: "",
        buckets: [],
        priority: 1,
        holidayList: [],
        selectedBucket: {},
        selectedSequence: {},
        isError: false,
        isSaved: false,
        isIncomplete: false,
        isIncompleteHoliday: false,
        show: false,
        showOverlapWarning: false,
        sortOrder: "1",
        apiMissing: false,
        isLoading: false,
      };
    }

    this.handleFormSubmit = this.handleFormSubmit.bind(this);

    this.monthList = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  }

  componentDidMount() {
    if (this.props.isEdit && this.state.schedule === "3") {
      let countryInfo = {
        country: this.state.country,
        source: this.state.holidaySource,
        type: this.state.type,
        apiKey: this.props.settings.settings.apiKey,
      };
      var xhr = new XMLHttpRequest();
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var response = xhr.responseText,
              json = JSON.parse(response);
            if (json.apiKeyMissing) this.setState({ apiMissing: true });
            this.setState({ holidayList: json });
          } else if (xhr.status === 400) {
            var response = xhr.responseText,
              json = JSON.parse(response);
            if (json.apiKeyMissing) this.setState({ apiMissing: true });
          }
          {
            this.setState({
              error: xhr.responseText,
            });
          }
        }
      });
      xhr.open("POST", "/backend/holiday", true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(countryInfo));
    }
  }

  handleDate = (e) => {
    this.setState({ [e.target.name]: e.target.value.toString() });
  };

  handleSchedule = (e) => {
    const newSchedule = e.target.value.toString();

    if (newSchedule === "3") {
      const { country, type, sortOrder, holidaySource } = this.state;

      const countryInfo = {
        country,
        source: holidaySource,
        type,
        apiKey: this.props.settings.settings.apiKey,
      };

      this.setState({ isLoading: true });

      var xhr = new XMLHttpRequest();

      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var response = xhr.responseText,
              json = JSON.parse(response);
            if (json.apiKeyMissing) this.setState({ apiMissing: true });
            this.setState({
              schedule: newSchedule,
              holidayList: this.sortHolidayList(json, sortOrder),
              holiday: "-1",
              states: "",
              isLoading: false,
            });
          } else if (xhr.status === 400) {
            var response = xhr.responseText,
              json = JSON.parse(response);
            if (json.apiKeyMissing) this.setState({ apiMissing: true });
          }
          {
            this.setState({
              error: xhr.responseText,
            });
          }
        }
      });

      xhr.open("POST", "/backend/holiday", true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(countryInfo));
    } else {
      this.setState({ schedule: newSchedule });
    }
  };

  handleHoliday = (e) => {
    const [holidayName, states, date] = e.target.value.split("||");
    this.setState({ holiday: holidayName, states: states, holidayDate: date });
  };

  handleSource = (e) => {
    const newSource = e.target.value.toString();
    const { country, type, sortOrder } = this.state;

    const countryInfo = {
      country,
      source: newSource,
      type,
      apiKey: this.props.settings.settings.apiKey,
    };

    this.setState({ isLoading: true });

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = xhr.responseText,
            json = JSON.parse(response);
          if (json.apiKeyMissing) this.setState({ apiMissing: true });
          this.setState({
            holidaySource: newSource,
            holidayList: this.sortHolidayList(json, sortOrder),
            holiday: "-1",
            states: "",
            isLoading: false,
          });
        } else if (xhr.status === 400) {
          var response = xhr.responseText,
            json = JSON.parse(response);
          if (json.apiKeyMissing) this.setState({ apiMissing: true });
        }
        {
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/holiday", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(countryInfo));
  };

  handleType = (e) => {
    const newType = e.target.value.toString();
    const { country, holidaySource, sortOrder } = this.state;

    const countryInfo = {
      country,
      source: holidaySource,
      type: newType,
      apiKey: this.props.settings.settings.apiKey,
    };

    var xhr = new XMLHttpRequest();

    this.setState({ isLoading: true });

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = xhr.responseText,
            json = JSON.parse(response);
          if (json.apiKeyMissing) this.setState({ apiMissing: true });
          this.setState({
            type: newType,
            holidayList: this.sortHolidayList(json, sortOrder),
            holiday: "-1",
            states: "",
            isLoading: false,
          });
        } else if (xhr.status === 400) {
          var response = xhr.responseText,
            json = JSON.parse(response);
          if (json.apiKeyMissing) this.setState({ apiMissing: true });
        }
        {
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/holiday", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(countryInfo));
  };

  handleCountry = (e) => {
    const newCountry = e.target.value.toString();
    const { holidaySource, type, sortOrder } = this.state;

    const countryInfo = {
      country: newCountry,
      source: holidaySource,
      type,
      apiKey: this.props.settings.settings.apiKey,
    };

    var xhr = new XMLHttpRequest();

    this.setState({ isLoading: true });

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = xhr.responseText,
            json = JSON.parse(response);
          this.setState({
            apiMissing: json.apiKeyMissing,
            country: newCountry,
            holidayList: this.sortHolidayList(json, sortOrder),
            holiday: "-1",
            states: "",
            isLoading: false,
          });
        } else if (xhr.status === 400) {
          var response = xhr.responseText,
            json = JSON.parse(response);
          if (json.apiKeyMissing) this.setState({ apiMissing: true });
        } else {
          this.setState({
            error: xhr.responseText,
          });
        }
      }
    });

    xhr.open("POST", "/backend/holiday", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(countryInfo));
  };

  handleClickBuckets = (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    var temp = JSON.parse(target.value);

    this.setState({ selectedSequence: temp });
  };

  handleClick = (e) => {
    e.preventDefault();
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

  handleRemove = (e) => {
    e.preventDefault();
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

  handlePriority = (e) => {
    this.setState({ priority: e.target.value });
  };

  handleSortOrder = (order) => {
    this.setState((prevState) => ({
      sortOrder: order,
      holidayList: this.sortHolidayList(prevState.holidayList, order),
    }));
  };

  sortHolidayList = (list, order) => {
    if (!list) return [];
    if (order === "1") {
      return [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    if (order === "2") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  };

  handleFormSubmit = async (e) => {
    e.preventDefault();

    this.setState({ isIncomplete: false });

    if (this.state.name === "" || this.state.buckets.length === 0) {
      this.setState({ isIncomplete: true });
      return;
    }

    if (this.state.schedule === "3" && this.state.holiday === "-1") {
      this.setState({ isIncompleteHoliday: true });
      return;
    }

    // Check for a "no schedule" condition (schedule === "2") within other sequences
    // if (
    //   this.state.schedule === "2" &&
    //   this.props.settings.sequences
    //     .filter((element) => element.id !== this.state.id)
    //     .findIndex(({ schedule }) => schedule === "2") !== -1
    // ) {
    //   this.setState({ show: true });
    //   return;
    // }

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
      country: this.state.country,
      holiday: this.state.holiday,
      states: this.state.states,
      type: this.state.type,
      holidayDate: this.state.holidayDate,
      holidaySource: this.state.holidaySource,
      priority: this.state.priority,
      buckets: this.state.buckets.map(({ uid, ...rest }) => rest),
    };

    // // Improved overlap detection
    // const isOverlap = (start1, end1, start2, end2) => {
    //   const dateToNumber = (month, day) => new Date(2024, month - 1, day).getTime();

    //   const [start1Num, end1Num] = [dateToNumber(start1.month, start1.day), dateToNumber(end1.month, end1.day)];
    //   const [start2Num, end2Num] = [dateToNumber(start2.month, start2.day), dateToNumber(end2.month, end2.day)];

    //   const isWrapped1 = start1Num > end1Num;
    //   const isWrapped2 = start2Num > end2Num;

    //   if (isWrapped1 && isWrapped2) {
    //     return true;
    //   } else if (isWrapped1) {
    //     return start1Num <= end2Num || end1Num >= start2Num || (start1Num <= end2Num && end1Num >= start2Num);
    //   } else if (isWrapped2) {
    //     return start2Num <= end1Num || end2Num >= start1Num || (start2Num <= end1Num && end2Num >= start1Num);
    //   } else {
    //     return start1Num <= end2Num && end1Num >= start2Num;
    //   }
    // };

    // // Check for overlap with existing sequences, excluding itself
    // const newStart = { month: temp.startMonth, day: temp.startDay };
    // const newEnd = { month: temp.endMonth, day: temp.endDay };

    // const overlapFound = settings.sequences
    //   .filter(({ id, schedule }) => id !== temp.id && schedule !== "2") // Exclude the current sequence by ID
    //   .some(({ startMonth, startDay, endMonth, endDay }) => {
    //     if (this.state.schedule === "1") {
    //       const existingStart = { month: startMonth, day: startDay };
    //       const existingEnd = { month: endMonth, day: endDay };
    //       return isOverlap(newStart, newEnd, existingStart, existingEnd);
    //     }
    //     return false;
    //   });

    const overlapFound = settings.sequences
      .filter(({ id }) => id !== temp.id) // Exclude the current sequence by ID
      .some(({ priority }) => priority === temp.priority);

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
    const countries = [];
    const startMonths = [];
    const startDays = [];
    const endMonths = [];
    const endDays = [];
    for (let i = 1; i <= 12; i++) {
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
    for (let i = 1; i <= this.monthList[this.state.startMonth]; i++) {
      startDays.push(
        <option value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>
      );
    }
    for (let i = 1; i <= this.monthList[this.state.endMonth]; i++) {
      endDays.push(
        <option value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>
      );
    }
    if (this.state.holidaySource === "1") {
      for (let i = 0; i < countryNames.length; i++) {
        countries.push(<option value={countryCodes[i]}>{countryNames[i]}</option>);
      }
    } else {
      for (let i = 0; i < countryNamesCalrific.length; i++) {
        countries.push(<option value={countryCodesCalrific[i]}>{countryNamesCalrific[i]}</option>);
      }
    }

    return (
      <Form className={`form-content ${this.props.isDarkMode ? "dark-mode" : ""}`}>
        <Form.Label for="name">Name of sequence &nbsp;&nbsp;</Form.Label>
        <Form.Control value={this.state.name} id="name" name="name" onChange={this.handleName} size="sm" />
        <div className="div-seperator" />
        <Form.Label for="priority">Sequence Priority &nbsp;&nbsp;</Form.Label>
        <OverlayTrigger placement="right" overlay={<Tooltip>Lower numbers have a higher priority.</Tooltip>}>
          <img src={Info} className="image-info" alt="info" />
        </OverlayTrigger>
        <Form.Control
          type="number"
          min={1}
          max={100}
          defaultValue={this.state.priority}
          style={{ width: "80px" }}
          onChange={this.handlePriority}
        />
        <div className="div-seperator" />
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
          <Form.Check
            inline
            type="radio"
            label="Holiday"
            value="3"
            id="schedule"
            name="schedule"
            onChange={this.handleSchedule}
            size="sm"
            checked={this.state.schedule === "3"}
          />
        </div>
        {this.state.isLoading ? (
          <div>
            <img src={Loading} alt="Loading" width="25" />
          </div>
        ) : (
          <></>
        )}
        <div className="div-seperator" />
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
              >
                {startMonths}
              </Form.Select>
              <Form.Select
                value={this.state.startDay}
                id="startDay"
                name="startDay"
                onChange={this.handleDate}
                size="sm"
              >
                {startDays}
              </Form.Select>
            </Stack>
            <div className="div-seperator" />
            <Stack gap={1} direction="horizontal">
              End Date:&nbsp;&nbsp;
              <Form.Select
                value={this.state.endMonth}
                id="endMonth"
                name="endMonth"
                onChange={this.handleDate}
                size="sm"
              >
                {endMonths}
              </Form.Select>
              <Form.Select value={this.state.endDay} id="endDay" name="endDay" onChange={this.handleDate} size="sm">
                {endDays}
              </Form.Select>
            </Stack>
            <div className="div-seperator" />
          </>
        ) : (
          <></>
        )}
        {this.state.schedule === "3" ? (
          <>
            <Form.Label for="source">Source</Form.Label>&nbsp;&nbsp;
            <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip>
                  Legacy (Nager.Date):
                  <br />
                  <br />
                  This option pulls the calendar information from the same source that has been used since v1.1.0. This
                  comes from an API that does not require a login or API key. The drawback is that the dates are limited
                  to federal/public holidays and fewer supported countries.
                  <br />
                  <br />
                  Premier (Calendarific):
                  <br />
                  <br />
                  This option pulls the calendar information from Calendarific. This site requires a login and API key,
                  however, there is a free account which allows up to 500 API calls a day which should be plenty for the
                  use of this app. Once you sign up you'll need to enter your API key (field only appears when Premier
                  is selected). The advantage to this calendar is that it covers a wider variety of holidays (like
                  Mother's Day and Easter).
                </Tooltip>
              }
            >
              <img src={Info} className="image-info" alt="info" />
            </OverlayTrigger>
            <div>
              <Form.Check
                inline
                type="radio"
                label="Legacy (Nager.Date)"
                value="1"
                id="source"
                name="source"
                onChange={this.handleSource}
                size="sm"
                checked={this.state.holidaySource === "1"}
              />
              <Form.Check
                inline
                type="radio"
                label="Premier (Calendarific)"
                value="2"
                id="source"
                name="source"
                onChange={this.handleSource}
                size="sm"
                checked={this.state.holidaySource === "2"}
              />

              {this.state.apiMissing ? (
                <i style={{ color: "#f00" }}>&nbsp; You must enter an API key in settings to use Calendarific</i>
              ) : (
                <></>
              )}
            </div>
            <div className="div-seperator" />
            <Stack gap={1} direction="horizontal">
              Country:&nbsp;&nbsp;
              <Form.Select
                value={this.state.country}
                id="country"
                name="country"
                onChange={this.handleCountry}
                size="sm"
                style={{ width: "200px" }}
              >
                {countries}
              </Form.Select>
            </Stack>
            <div className="div-seperator" />
            {this.state.holidaySource === "2" ? (
              <>
                <Form.Label for="type">Type</Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    label="National"
                    value="1"
                    id="type"
                    name="type"
                    onChange={this.handleType}
                    size="sm"
                    checked={this.state.type === "1"}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Local"
                    value="2"
                    id="type"
                    name="type"
                    onChange={this.handleType}
                    size="sm"
                    checked={this.state.type === "2"}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Religious"
                    value="3"
                    id="type"
                    name="type"
                    onChange={this.handleType}
                    size="sm"
                    checked={this.state.type === "3"}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Observance"
                    value="4"
                    id="type"
                    name="type"
                    onChange={this.handleType}
                    size="sm"
                    checked={this.state.type === "4"}
                  />
                </div>
                <div className="div-seperator" />
              </>
            ) : (
              <></>
            )}
            <Stack gap={2} direction="horizontal">
              Holiday:&nbsp;&nbsp;
              <Form.Select
                value={`${this.state.holiday}||${this.state.states}||${this.state.holidayDate}`}
                id="holiday"
                name="holiday"
                onChange={this.handleHoliday}
                size="sm"
                style={{ width: "600px" }}
                disabled={this.state.holidayList.length === 0}
              >
                {this.state.holidayList.length === 0 ? (
                  <option value="-1">No Holidays Returned</option>
                ) : (
                  <option value="-1">Select a Holiday</option>
                )}
                {this.state.holidayList.map((holiday) => (
                  <option
                    key={`${holiday.name}||${holiday.states}||${holiday.rawDate}`}
                    value={`${holiday.name}||${holiday.states}||${holiday.rawDate}`}
                    title={holiday.states}
                  >
                    {holiday.name} ({holiday.date}) {holiday.states === "All" ? "Entire Country" : holiday.states}
                  </option>
                ))}
              </Form.Select>
              <Button
                onClick={() => this.handleSortOrder("2")}
                variant={this.props.isDarkMode ? "outline-light" : "light"}
              >
                <Image src={SortName} alt="Sort Name" className="arrow-icon" />
              </Button>
              <Button
                onClick={() => this.handleSortOrder("1")}
                variant={this.props.isDarkMode ? "outline-light" : "light"}
              >
                <Image src={SortDate} alt="Sort Date" className="arrow-icon" />
              </Button>
            </Stack>
            <div className="div-seperator" />
          </>
        ) : (
          <></>
        )}
        <Row xs={1} sm="auto">
          <Col xs="auto">
            {/* File Listing */}
            <div className="div-font">
              <Card className="card-custom">
                <Card.Title className="m-0 p-2">
                  <ListGroup.Item className="listgroup-header">Bucket Sequence</ListGroup.Item>
                </Card.Title>
                <Card.Body className="m-0 p-0 card-body-custom">
                  <ListGroup variant="flush">
                    {this.state.buckets.length === 0 ? (
                      <ListGroup.Item className="listgroup-custom-s">&lt;Add Buckets Here&gt;</ListGroup.Item>
                    ) : (
                      this.state.buckets.map((bucket, idx) => (
                        <React.Fragment key={bucket.uid}>
                          {idx !== 0 && (
                            <ListGroup.Item className="listgroup-arrow">
                              <div className="listgroup-arrow-div">
                                <Image src={DownArrowShort} alt="Down Arrow" className="arrow-icon" />
                              </div>
                            </ListGroup.Item>
                          )}
                          {this.state.selectedSequence.uid === bucket.uid ? (
                            <ListGroup.Item
                              value={JSON.stringify(bucket)}
                              action
                              active
                              onClick={this.handleClickBuckets}
                              className="d-flex justify-content-between listgroup-custom-active"
                            >
                              {this.props.settings.buckets.find(({ id }) => id === bucket.id.toString()).name}
                            </ListGroup.Item>
                          ) : (
                            <ListGroup.Item
                              value={JSON.stringify(bucket)}
                              action
                              onClick={this.handleClickBuckets}
                              className="d-flex justify-content-between listgroup-custom-s"
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
            <div className="div-seperator" />
            <Button
              onClick={this.handleRemove}
              type="submit"
              variant={this.props.isDarkMode ? "outline-light" : "light"}
            >
              Remove
            </Button>
            &nbsp;&nbsp;
            <Button onClick={this.handleMoveUp} variant={this.props.isDarkMode ? "outline-light" : "light"}>
              <Image src={UpArrow} alt="UpArrow" className="arrow-icon" />
            </Button>
            &nbsp;&nbsp;
            <Button onClick={this.handleMoveDown} variant={this.props.isDarkMode ? "outline-light" : "light"}>
              <Image src={DownArrow} alt="DownArrow" className="arrow-icon" />
            </Button>
            <div className="div-seperator" />
          </Col>
          <Col xs="auto" className="d-flex align-items-center justify-content-center">
            <Button onClick={this.handleAdd} variant={this.props.isDarkMode ? "outline-light" : "light"}>
              <Image src={LeftArrow} alt="UpArrow" className="arrow-icon" />
            </Button>
            <div className="div-seperator" />
          </Col>
          <Col xs="auto">
            {/* Bucket Listing */}
            <div className="div-font">
              <Card className="card-custom">
                <Card.Title className="m-0 p-2">
                  <ListGroup.Item className="listgroup-header">List of Buckets</ListGroup.Item>
                </Card.Title>
                <Card.Body className="m-0 p-0 card-body-custom">
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
                            className="listgroup-custom-active"
                          >
                            {bucket.name}
                          </ListGroup.Item>
                        ) : (
                          <ListGroup.Item
                            key={bucket.id}
                            value={JSON.stringify(bucket)}
                            action
                            onClick={this.handleClick}
                            className="listgroup-custom-b"
                          >
                            {bucket.name}
                          </ListGroup.Item>
                        )
                      )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
            <div className="div-seperator" />
          </Col>
        </Row>
        <Button onClick={this.props.cancel} variant={this.props.isDarkMode ? "outline-light" : "light"}>
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
        {this.state.isIncompleteHoliday ? <i style={{ color: "#f00" }}>&nbsp; You must select a holiday.</i> : <></>}
        {this.state.isSaved ? <i style={{ color: "#00a700" }}>&nbsp; Settings saved. </i> : <></>}
        <div className="div-seperator" />
        <Modal
          show={this.state.show}
          onHide={this.handleClose}
          size="sm"
          backdrop="static"
          className={this.props.isDarkMode ? "dark-mode" : ""}
        >
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
        <Modal
          show={this.state.showOverlapWarning}
          onHide={this.handleCloseOverlap}
          size="sm"
          backdrop="static"
          className={this.props.isDarkMode ? "dark-mode" : ""}
        >
          <Modal.Header>
            <h3>Error</h3>
          </Modal.Header>
          <Modal.Body>
            To prevent conflicts, two sequences cannot have the same priority.
            <br />
            <br />
            See Preroll Plus documentation for more information.
            <br />
            <br />
            <Button onClick={this.handleCloseOverlap}>Acknowledge</Button>
          </Modal.Body>
        </Modal>
      </Form>
    );
  }
}
