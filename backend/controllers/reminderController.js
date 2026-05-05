const Reminder = require("../models/reminder.js");
const { apiSuccess, apiFail } = require("../utils/apiResponse.js");

const DEFAULT_TIME_ZONE = "Asia/Colombo";

const formatDateToYMD = (date) => date.toISOString().slice(0, 10);

const formatDateToYMDInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const dateParts = parts.reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

const DAY_NAME_TO_INDEX = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const normalizeFrequency = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["once", "one_time", "one time", "single", "single_date", "single date"].includes(normalized)) {
    return "once";
  }

  if (["daily", "everyday", "every_day", "every day"].includes(normalized)) {
    return "daily";
  }

  if (["weekly", "specific_days", "specific_days_of_week", "specific day", "specific days"].includes(normalized)) {
    return "weekly";
  }

  if (["custom", "specific", "specific_dates", "specific_dates_of_month", "specific date", "specific dates"].includes(normalized)) {
    return "specific";
  }

  return normalized;
};

const normalizeDayValue = (value) => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }

  const stringValue = String(value || "").trim();

  if (/^\d+$/.test(stringValue)) {
    const numericValue = Number(stringValue);
    if (numericValue >= 0 && numericValue <= 6) {
      return numericValue;
    }
  }

  return DAY_NAME_TO_INDEX[stringValue.toLowerCase()];
};

const toYmdDateString = (value, timeZone) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return timeZone ? formatDateToYMDInTimeZone(value, timeZone) : formatDateToYMD(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const canonicalMatch = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);

    if (canonicalMatch) {
      const [, year, month, day] = canonicalMatch;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return timeZone ? formatDateToYMDInTimeZone(parsed, timeZone) : formatDateToYMD(parsed);
    }
  }

  return null;
};

const normalizeDateList = (values, timeZone) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(new Set(values.map((value) => toYmdDateString(value, timeZone)).filter(Boolean))).sort();
};

const getReminderDisabledDates = (reminder) => (
  Array.isArray(reminder?.disabledDates)
    ? reminder.disabledDates.map((value) => String(value).trim()).filter(Boolean)
    : []
);

const buildScheduleFields = ({ source, timeZone, requireFrequency }) => {
  const frequency = normalizeFrequency(source?.frequency);

  if (!frequency) {
    if (requireFrequency) {
      return { error: "Frequency is required." };
    }

    return {
      frequency,
      date: undefined,
      daysOfWeek: [],
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "once") {
    const date = toYmdDateString(source?.date, timeZone)
      || normalizeDateList(source?.specificDates, timeZone)[0]
      || normalizeDateList(source?.customDates, timeZone)[0];

    if (!date) {
      return { error: "A date is required for once frequency." };
    }

    return {
      frequency,
      date,
      daysOfWeek: [],
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "daily") {
    return {
      frequency,
      date: undefined,
      daysOfWeek: [],
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "weekly") {
    const daysOfWeek = Array.from(
      new Set(
        (Array.isArray(source?.daysOfWeek) ? source.daysOfWeek : [])
          .map(normalizeDayValue)
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      )
    ).sort((a, b) => a - b);

    if (daysOfWeek.length === 0) {
      return { error: "Select at least one day for weekly frequency." };
    }

    return {
      frequency,
      date: undefined,
      daysOfWeek,
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "specific") {
    const specificDates = normalizeDateList(
      Array.isArray(source?.specificDates) ? source.specificDates : source?.customDates,
      timeZone
    );

    if (specificDates.length === 0) {
      return { error: "Select at least one date for specific frequency." };
    }

    return {
      frequency,
      date: undefined,
      daysOfWeek: [],
      specificDates,
      customDates: [],
    };
  }

  return { error: "Invalid frequency value." };
};

const getRequestUserId = (req) => req.body?.userId || req.query?.userId;
const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object || {}, field);

const buildReminderPayload = (req) => {
  const reminderPayload = {
    ...req.body,
    createdFrom: req.body?.createdFrom || "user",
  };

  delete reminderPayload.email;
  delete reminderPayload.userEmail;
  delete reminderPayload.recipientEmail;
  delete reminderPayload.user;

  return reminderPayload;
};

 const createReminder = async (req, res) => {
  const userId = getRequestUserId(req);

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminderPayload = buildReminderPayload(req);
  const scheduleFields = buildScheduleFields({
    source: reminderPayload,
    timeZone: reminderPayload.timezone || DEFAULT_TIME_ZONE,
    requireFrequency: true,
  });

  if (scheduleFields.error) {
    return res.status(400).json(apiFail(scheduleFields.error));
  }

  const reminder = await Reminder.create({
    ...reminderPayload,
    ...scheduleFields,
    userId,
  });

  return res.status(201).json(
    apiSuccess(
      {
        reminder,
      },
      "Reminder created"
    )
  );
};

 const getTodayReminders = async (req, res) => {
  const userId = req.params.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminders = await Reminder.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  const remindersWithUiState = reminders.map((reminder) => {
    const timeZone = reminder.timezone || DEFAULT_TIME_ZONE;
    const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);
    const disabledToday = Boolean(reminder.isDisabledToday)
      || getReminderDisabledDates(reminder).includes(todayDate);

    return {
      ...reminder,
      disabledToday,
      status: disabledToday ? "skipped" : "pending",
    };
  });

  return res.json(
    apiSuccess(
      {
        reminders: remindersWithUiState,
        count: remindersWithUiState.length,
      },
      "Reminders retrieved"
    )
  );
};

 const updateReminder = async (req, res) => {
  const userId = getRequestUserId(req);
  const reminderId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminder = await Reminder.findById(reminderId);

  if (!reminder) {
    return res.status(404).json(apiFail("Reminder not found."));
  }

  if (String(reminder.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to update this reminder."));
  }

  const scheduleFieldsTouched = ["frequency", "date", "daysOfWeek", "specificDates", "customDates"]
    .some((field) => hasOwn(req.body, field));

  if (scheduleFieldsTouched) {
    const nextTimeZone = req.body.timezone || reminder.timezone || DEFAULT_TIME_ZONE;
    const mergedScheduleSource = {
      frequency: hasOwn(req.body, "frequency") ? req.body.frequency : reminder.frequency,
      date: hasOwn(req.body, "date") ? req.body.date : reminder.date,
      daysOfWeek: hasOwn(req.body, "daysOfWeek") ? req.body.daysOfWeek : reminder.daysOfWeek,
      specificDates: hasOwn(req.body, "specificDates")
        ? req.body.specificDates
        : (Array.isArray(reminder.specificDates) ? reminder.specificDates : reminder.customDates),
      customDates: hasOwn(req.body, "customDates")
        ? req.body.customDates
        : (Array.isArray(reminder.customDates) ? reminder.customDates : reminder.specificDates),
    };

    const normalizedSchedule = buildScheduleFields({
      source: mergedScheduleSource,
      timeZone: nextTimeZone,
      requireFrequency: true,
    });

    if (normalizedSchedule.error) {
      return res.status(400).json(apiFail(normalizedSchedule.error));
    }

    reminder.frequency = normalizedSchedule.frequency;
    reminder.date = normalizedSchedule.date;
    reminder.daysOfWeek = normalizedSchedule.daysOfWeek;
    reminder.specificDates = normalizedSchedule.specificDates;
    reminder.customDates = normalizedSchedule.customDates;
  }

  const allowedFields = [
    "title",
    "description",
    "category",
    "time",
    "disabledDates",
    "isActive",
    "timezone",
    "isDisabledToday",
  ];

  const previousDisabledDates = getReminderDisabledDates(reminder);

  allowedFields.forEach((field) => {
    if (hasOwn(req.body, field)) {
      reminder[field] = req.body[field];
    }
  });

  const updatedReminder = await reminder.save();

  if (hasOwn(req.body, "disabledDates") || hasOwn(req.body, "isDisabledToday")) {
    const timeZone = updatedReminder.timezone || reminder.timezone || DEFAULT_TIME_ZONE;
    const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);
    const hadTodayBefore = previousDisabledDates.includes(todayDate);
    const hasTodayAfter = getReminderDisabledDates(updatedReminder).includes(todayDate)
      || Boolean(updatedReminder.isDisabledToday);

    if (!hadTodayBefore && hasTodayAfter) {
      await Reminder.updateOne(
        { _id: reminderId },
        { $set: { isDisabledToday: true } }
      );
    }
  }

  return res.json(
    apiSuccess(
      {
        reminder: updatedReminder,
      },
      "Reminder updated"
    )
  );
};

 const deleteReminder = async (req, res) => {
  const userId = getRequestUserId(req);
  const reminderId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminder = await Reminder.findById(reminderId).lean();

  if (!reminder) {
    return res.status(404).json(apiFail("Reminder not found."));
  }

  if (String(reminder.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to delete this reminder."));
  }

  await Reminder.deleteOne({ _id: reminderId });

  return res.json(
    apiSuccess(
      {
        reminderId,
      },
      "Reminder deleted"
    )
  );
};

 module.exports = {
   createReminder,
   getTodayReminders,
   updateReminder,
   deleteReminder,
 };
