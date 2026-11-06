import React, { Component, createRef } from "react";
import { v4 as uuid } from "uuid";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Stack from "react-bootstrap/Stack";
import UpArrow from "bootstrap-icons/icons/arrow-up.svg";
import DownArrow from "bootstrap-icons/icons/arrow-down.svg";
import DownArrowShort from "bootstrap-icons/icons/arrow-down-short.svg";
import SortName from "bootstrap-icons/icons/sort-alpha-down.svg";
import SortDate from "bootstrap-icons/icons/sort-numeric-down.svg";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import Loading from "../../images/loading-gif.gif";
import { countryNames, countryCodes, countryNamesCalrific, countryCodesCalrific } from "./countries";
import SettingsSection from "../SettingsSection/SettingsSection";
import { InfoLabel } from "../Common/FormFields";
import { PickerLayout, PickerPane } from "../Common/Picker";
import { api } from "../../api";
import { DAY_FIRST } from "../../locale";
import "./CreateSeq.css";

const MONTHS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DAYS = {
  M: 1 << 0,
  T: 1 << 1,
  W: 1 << 2,
  Th: 1 << 3,
  F: 1 << 4,
  Sa: 1 << 5,
  Su: 1 << 6,
};

const DAY_LABELS = ["M", "T", "W", "Th", "F", "Sa", "Su"];

const SCHEDULE_TYPES = [
  ["2", "No Schedule"],
  ["1", "Custom"],
  ["4", "Day of Week"],
  ["3", "Holiday"],
];

const SCHEDULE_HINTS = {
  2: "Matches every day. It plays whenever no matching sequence has a lower priority number.",
  1: "Plays between the start and end dates every year. The range can wrap past the end of the year.",
  4: "Plays on the checked days of the week.",
  3: "Plays on a holiday, optionally starting some days before and ending some days after.",
};

const HOLIDAY_TYPES = [
  ["1", "National"],
  ["2", "Local"],
  ["3", "Religious"],
  ["4", "Observance"],
];

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
        preHoliday: info.preHoliday ?? "0",
        postHoliday: info.postHoliday ?? "0",
        days: info.days ?? 0,
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
        isDays: true,
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
        preHoliday: "0",
        postHoliday: "0",
        days: 0,
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
        isDays: true,
      };
    }

    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  formRef = createRef();

  componentDidMount() {
    // The editor opens below the cards; bring it into view (mainly for phones)
    this.formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    if (this.props.isEdit && this.state.schedule === "3") {
      const { country, holidaySource: source, type } = this.state;
      this.fetchHolidays({ country, source, type }).then((list) => list && this.setState({ holidayList: list }));
    }

    if (this.props.isEdit) return; // ← early exit if editing

    const defaultBucket = this.props.settings?.settings?.defaultBucket?.trim?.() ?? "";

    if (!defaultBucket) return; // ← exit if missing, null, undefined, or empty/whitespace

    this.setState({
      buckets: [{ id: defaultBucket, uid: uuid() }],
    });
  }

  handleDate = (e) => {
    this.setState({ [e.target.name]: e.target.value.toString() });
  };

  /**
   * Holiday list for the Holiday dropdown, sorted by the chosen order. Returns null (and shows why) if it
   * couldn't be loaded, e.g. Calendarific without an API key.
   */
  fetchHolidays = async ({ country, source, type }) => {
    this.setState({ isLoading: true });
    try {
      const list = await api.post("backend/holiday", {
        country,
        source,
        type,
        apiKey: this.props.settings.settings.apiKey,
      });
      this.setState({ isLoading: false, apiMissing: false });
      return this.sortHolidayList(list, this.state.sortOrder);
    } catch (err) {
      const apiKeyMissing = !!err.data?.apiKeyMissing;
      this.setState({
        isLoading: false,
        apiMissing: apiKeyMissing,
        ...(apiKeyMissing ? {} : { error: err.body || err.message }),
      });
      return null;
    }
  };

  // After the holiday source, type or country changes: new list, and the holiday must be picked again
  applyHolidayList = (list, changes) => {
    if (list) this.setState({ ...changes, holidayList: list, holiday: "-1", states: "" });
  };

  handleSchedule = async (e) => {
    const newSchedule = e.target.value.toString();

    if (newSchedule === "3") {
      const { country, type, holidaySource: source } = this.state;
      this.applyHolidayList(await this.fetchHolidays({ country, source, type }), { schedule: newSchedule });
    } else {
      this.setState({ schedule: newSchedule });
    }
  };

  handleHoliday = (e) => {
    const [holidayName, states, date] = e.target.value.split("||");
    this.setState({ holiday: holidayName, states: states, holidayDate: date });
  };

  handleSource = async (e) => {
    const source = e.target.value.toString();
    const { country, type } = this.state;
    this.applyHolidayList(await this.fetchHolidays({ country, source, type }), { holidaySource: source });
  };

  handleType = async (e) => {
    const type = e.target.value.toString();
    const { country, holidaySource: source } = this.state;
    this.applyHolidayList(await this.fetchHolidays({ country, source, type }), { type });
  };

  handleCountry = async (e) => {
    const country = e.target.value.toString();
    const { holidaySource: source, type } = this.state;
    this.applyHolidayList(await this.fetchHolidays({ country, source, type }), { country });
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

  handlePreHoliday = (e) => {
    this.setState({ preHoliday: e.target.value });
  };

  handlePostHoliday = (e) => {
    this.setState({ postHoliday: e.target.value });
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
      // rawDate is ISO ("2026-12-25"); the shown date is localized and can't be parsed reliably
      return [...list].sort((a, b) => (a.rawDate ?? a.date).localeCompare(b.rawDate ?? b.date));
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

    if (this.state.schedule === "4" && this.state.days === 0) {
      this.setState({ isDays: false });
      return;
    }

    if (this.state.schedule === "3" && this.state.holiday === "-1") {
      this.setState({ isIncompleteHoliday: true });
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
      country: this.state.country,
      holiday: this.state.holiday,
      states: this.state.states,
      preHoliday: this.state.preHoliday,
      postHoliday: this.state.postHoliday,
      type: this.state.type,
      holidayDate: this.state.holidayDate,
      holidaySource: this.state.holidaySource,
      days: this.state.days,
      priority: this.state.priority,
      buckets: this.state.buckets.map(({ uid, ...rest }) => rest),
    };

    const overlapFound = settings.sequences
      .filter(({ id }) => id !== temp.id)
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

    api
      .saveSettings(settings)
      .then(async () => {
        this.setState({ isSaved: true });
        await api.updatePrerolls();
        this.props.onSettingsSaved?.();
      })
      .catch((err) => this.setState({ error: err.body || err.message }));

    this.props.saved();
  };

  handleClose = () => this.setState({ show: false });

  handleCloseOverlap = () => this.setState({ showOverlapWarning: false });

  isDaySelected = (dayKey) => {
    return (this.state.days & DAYS[dayKey]) !== 0;
  };

  toggleDay = (dayKey) => {
    const bit = DAYS[dayKey];
    this.setState((prev) => ({
      days: prev.days ^ bit,
    }));
  };

  render() {
    const countries = [];
    const startMonths = [];
    const startDays = [];
    const endMonths = [];
    const endDays = [];
    for (let i = 1; i <= 12; i++) {
      startMonths.push(
        <option key={i} value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>,
      );
      endMonths.push(
        <option key={i} value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>,
      );
    }
    for (let i = 1; i <= MONTHS[this.state.startMonth]; i++) {
      startDays.push(
        <option key={i} value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>,
      );
    }
    for (let i = 1; i <= MONTHS[this.state.endMonth]; i++) {
      endDays.push(
        <option key={i} value={i.toString()}>
          {i.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}
        </option>,
      );
    }
    if (this.state.holidaySource === "1") {
      for (let i = 0; i < countryNames.length; i++) {
        countries.push(
          <option key={countryCodes[i]} value={countryCodes[i]}>
            {countryNames[i]}
          </option>,
        );
      }
    } else {
      for (let i = 0; i < countryNamesCalrific.length; i++) {
        countries.push(
          <option key={countryCodesCalrific[i]} value={countryCodesCalrific[i]}>
            {countryNamesCalrific[i]}
          </option>,
        );
      }
    }

    const variant = this.props.isDarkMode ? "outline-light" : "outline-secondary";

    return (
      <Form ref={this.formRef} className={`form-content editor-form ${this.props.isDarkMode ? "dark-mode" : ""}`}>
        <SettingsSection
          title={this.props.isEdit ? "Edit Sequence" : "New Sequence"}
          isDarkMode={this.props.isDarkMode}
        >
          <Row className="g-3">
            <Col xs={12} md={8}>
              <Form.Label htmlFor="name">Name</Form.Label>
              <Form.Control value={this.state.name} id="name" name="name" onChange={this.handleName} size="sm" />
            </Col>
            <Col xs={12} md={4}>
              <InfoLabel
                htmlFor="priority"
                tip="When more than one sequence matches a day, the one with the lowest number is used. Two sequences can't share a priority."
              >
                Priority
              </InfoLabel>
              <Form.Control
                type="number"
                min={1}
                max={100}
                id="priority"
                defaultValue={this.state.priority}
                className="number-input"
                onChange={this.handlePriority}
                size="sm"
              />
            </Col>
          </Row>
        </SettingsSection>

        <SettingsSection title="Schedule" isDarkMode={this.props.isDarkMode}>
          <div className="mb-2">
            {SCHEDULE_TYPES.map(([value, label]) => (
              <Form.Check
                key={value}
                inline
                type="radio"
                label={label}
                value={value}
                id={`schedule-${value}`}
                name="schedule"
                onChange={this.handleSchedule}
                checked={this.state.schedule === value}
              />
            ))}
          </div>
          <div className="schedule-hint mb-3">{SCHEDULE_HINTS[this.state.schedule]}</div>
          {this.state.isLoading && (
            <div className="mb-3">
              <img src={Loading} alt="Loading" width="25" />
            </div>
          )}
          {this.state.schedule === "1" && (
            <Row className="g-3">
              {[
                ["start", "Start Date", startMonths, startDays],
                ["end", "End Date", endMonths, endDays],
              ].map(([prefix, label, months, days]) => {
                const fields = [
                  ["Month", months],
                  ["Day", days],
                ];
                if (DAY_FIRST) fields.reverse();
                return (
                  <Col xs={12} sm={6} key={prefix}>
                    <Form.Label>{label}</Form.Label>
                    <Stack gap={2} direction="horizontal">
                      {fields.map(([unit, options]) => (
                        <React.Fragment key={unit}>
                          <span className="field-unit">{unit}</span>
                          <Form.Select
                            value={this.state[`${prefix}${unit}`]}
                            id={`${prefix}${unit}`}
                            name={`${prefix}${unit}`}
                            onChange={this.handleDate}
                            size="sm"
                            className="date-select"
                          >
                            {options}
                          </Form.Select>
                        </React.Fragment>
                      ))}
                    </Stack>
                  </Col>
                );
              })}
            </Row>
          )}
          {this.state.schedule === "4" && (
            <div className="day-checks">
              {DAY_LABELS.map((label) => (
                <Form.Check
                  key={label}
                  inline
                  type="checkbox"
                  id={label}
                  label={label}
                  checked={this.isDaySelected(label)}
                  onChange={() => this.toggleDay(label)}
                />
              ))}
            </div>
          )}
          {this.state.schedule === "3" && (
            <Row className="g-3">
              <Col xs={12}>
                <InfoLabel
                  tip={
                    <>
                      Legacy (Nager.Date):
                      <br />
                      <br />
                      This option pulls the calendar information from the same source that has been used since v1.1.0.
                      This comes from an API that does not require a login or API key. The drawback is that the dates
                      are limited to federal/public holidays and fewer supported countries.
                      <br />
                      <br />
                      Premier (Calendarific):
                      <br />
                      <br />
                      This option pulls the calendar information from Calendarific. This site requires a login and API
                      key, however, there is a free account which allows up to 500 API calls a day which should be
                      plenty for the use of this app. Once you sign up you'll need to enter your API key in Settings.
                      The advantage to this calendar is that it covers a wider variety of holidays (like Mother's Day
                      and Easter).
                    </>
                  }
                >
                  Holiday Source
                </InfoLabel>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    label="Legacy (Nager.Date)"
                    value="1"
                    id="source-1"
                    name="source"
                    onChange={this.handleSource}
                    checked={this.state.holidaySource === "1"}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Premier (Calendarific)"
                    value="2"
                    id="source-2"
                    name="source"
                    onChange={this.handleSource}
                    checked={this.state.holidaySource === "2"}
                  />
                </div>
                {this.state.apiMissing && (
                  <div className="error-text small">You must enter an API key in Settings to use Calendarific.</div>
                )}
              </Col>
              <Col xs={12} md={6}>
                <Form.Label htmlFor="country">Country</Form.Label>
                <Form.Select
                  value={this.state.country}
                  id="country"
                  name="country"
                  onChange={this.handleCountry}
                  size="sm"
                >
                  {countries}
                </Form.Select>
              </Col>
              {this.state.holidaySource === "2" && (
                <Col xs={12} md={6}>
                  <Form.Label>Type</Form.Label>
                  <div>
                    {HOLIDAY_TYPES.map(([value, label]) => (
                      <Form.Check
                        key={value}
                        inline
                        type="radio"
                        label={label}
                        value={value}
                        id={`type-${value}`}
                        name="type"
                        onChange={this.handleType}
                        checked={this.state.type === value}
                      />
                    ))}
                  </div>
                </Col>
              )}
              <Col xs={12}>
                <Form.Label htmlFor="holiday">Holiday</Form.Label>
                <Stack gap={2} direction="horizontal">
                  <Form.Select
                    value={`${this.state.holiday}||${this.state.states}`}
                    id="holiday"
                    name="holiday"
                    onChange={this.handleHoliday}
                    size="sm"
                    className="flex-grow-1 min-w-0"
                    disabled={this.state.holidayList.length === 0}
                  >
                    {this.state.holidayList.length === 0 ? (
                      <option value="-1">No Holidays Returned</option>
                    ) : (
                      <option value="-1">Select a Holiday</option>
                    )}
                    {this.state.holidayList.map((holiday) => (
                      <option
                        key={`${holiday.name}||${holiday.states}||${holiday.rawDate ?? holiday.date}`}
                        value={`${holiday.name}||${holiday.states}`}
                        title={holiday.states}
                      >
                        {holiday.name} ({holiday.date}) {holiday.states === "All" ? "Entire Country" : holiday.states}
                      </option>
                    ))}
                  </Form.Select>
                  <Button onClick={() => this.handleSortOrder("2")} variant={variant} size="sm" title="Sort by name">
                    <Image src={SortName} alt="Sort by name" className="arrow-icon" />
                  </Button>
                  <Button onClick={() => this.handleSortOrder("1")} variant={variant} size="sm" title="Sort by date">
                    <Image src={SortDate} alt="Sort by date" className="arrow-icon" />
                  </Button>
                </Stack>
              </Col>
              <Col xs={6} md={3}>
                <InfoLabel htmlFor="preHoliday" tip="Number of days before the holiday to start using this sequence.">
                  Days Before
                </InfoLabel>
                <Form.Control
                  type="number"
                  min={0}
                  max={364}
                  id="preHoliday"
                  defaultValue={this.state.preHoliday}
                  className="number-input"
                  onChange={this.handlePreHoliday}
                  size="sm"
                />
              </Col>
              <Col xs={6} md={3}>
                <InfoLabel htmlFor="postHoliday" tip="Number of days after the holiday to keep using this sequence.">
                  Days After
                </InfoLabel>
                <Form.Control
                  type="number"
                  min={0}
                  max={364}
                  id="postHoliday"
                  defaultValue={this.state.postHoliday}
                  className="number-input"
                  onChange={this.handlePostHoliday}
                  size="sm"
                />
              </Col>
            </Row>
          )}
        </SettingsSection>

        <SettingsSection
          title="Buckets"
          tooltip="Prerolls play in this order. Each time a movie starts, Preroll Plus picks one random file from each bucket."
          isDarkMode={this.props.isDarkMode}
        >
          <PickerLayout
            isDarkMode={this.props.isDarkMode}
            onAdd={this.handleAdd}
            addTitle="Add the selected bucket"
            chosen={
              <PickerPane
                title="Bucket Sequence"
                toolbar={
                  <>
                    <Button onClick={this.handleRemove} variant={variant} size="sm">
                      Remove
                    </Button>
                    <Button onClick={this.handleMoveUp} variant={variant} size="sm" title="Move up">
                      <Image src={UpArrow} alt="Move up" className="arrow-icon" />
                    </Button>
                    <Button onClick={this.handleMoveDown} variant={variant} size="sm" title="Move down">
                      <Image src={DownArrow} alt="Move down" className="arrow-icon" />
                    </Button>
                  </>
                }
              >
                {this.state.buckets.length === 0 ? (
                  <ListGroup.Item className="listgroup-custom-s">&lt;Add Buckets Here&gt;</ListGroup.Item>
                ) : (
                  this.state.buckets.map((bucket, idx) => (
                    <React.Fragment key={bucket.uid}>
                      {idx !== 0 && (
                        <ListGroup.Item className="listgroup-arrow">
                          <div className="listgroup-arrow-div">
                            <Image src={DownArrowShort} alt="then" className="arrow-icon" />
                          </div>
                        </ListGroup.Item>
                      )}
                      <ListGroup.Item
                        value={JSON.stringify(bucket)}
                        action
                        active={this.state.selectedSequence.uid === bucket.uid}
                        onClick={this.handleClickBuckets}
                        className={`d-flex justify-content-between ${
                          this.state.selectedSequence.uid === bucket.uid
                            ? "listgroup-custom-active"
                            : "listgroup-custom-s"
                        }`}
                      >
                        {this.props.settings.buckets.find(({ id }) => id === bucket.id.toString())?.name ??
                          "(deleted bucket)"}
                      </ListGroup.Item>
                    </React.Fragment>
                  ))
                )}
              </PickerPane>
            }
            available={
              <PickerPane title="List of Buckets">
                {this.props.settings.buckets
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((bucket) => (
                    <ListGroup.Item
                      key={bucket.id}
                      value={JSON.stringify(bucket)}
                      action
                      active={this.state.selectedBucket.id === bucket.id}
                      onClick={this.handleClick}
                      className={
                        this.state.selectedBucket.id === bucket.id ? "listgroup-custom-active" : "listgroup-custom-b"
                      }
                    >
                      {bucket.name}
                    </ListGroup.Item>
                  ))}
              </PickerPane>
            }
          />
        </SettingsSection>

        <div className="form-actions mb-4">
          <Button onClick={this.props.cancel} variant={variant}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" onClick={this.handleFormSubmit}>
            {this.props.isEdit ? "Update" : "Save"}
          </Button>
          {this.state.isIncomplete && (
            <i className="error-text">
              There must be at least one bucket in the list and a sequence name must be filled.
            </i>
          )}
          {!this.state.isDays && <i className="error-text">There must be at least one day of the week checked.</i>}
          {this.state.isIncompleteHoliday && <i className="error-text">You must select a holiday.</i>}
          {this.state.isSaved && <i className="conf-text">Settings saved.</i>}
        </div>
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
