const Reminder = require("../models/reminder.js");
const { apiSuccess, apiFail } = require("../utils/apiResponse.js");
const { analyzePrescription } = require("../services/ai/prescriptionAnalyzer.js");

const DEFAULT_TIME_ZONE = "Asia/Colombo";

const WEEKDAY_NAME_TO_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

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

const formatWeekdayToIndexInTimeZone = (date, timeZone) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date).toLowerCase();

  return WEEKDAY_NAME_TO_INDEX[weekday.slice(0, 3)];
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

const isReminderDueToday = (reminder, referenceDate = new Date()) => {
  if (!reminder) {
    return false;
  }

  const timeZone = reminder.timezone || DEFAULT_TIME_ZONE;
  const today = formatDateToYMDInTimeZone(referenceDate, timeZone);
  const normalizedFrequency = normalizeFrequency(reminder.frequency);
  const todayDayIndex = formatWeekdayToIndexInTimeZone(referenceDate, timeZone);

  if (normalizedFrequency === "once") {
    return toYmdDateString(reminder.date, timeZone) === today;
  }

  if (normalizedFrequency === "daily") {
    return true;
  }

  if (normalizedFrequency === "weekly") {
    return Array.isArray(reminder.daysOfWeek)
      && reminder.daysOfWeek.includes(todayDayIndex);
  }

  if (normalizedFrequency === "specific") {
    const specificDates = Array.isArray(reminder.specificDates)
      ? reminder.specificDates
      : reminder.customDates;

    return Array.isArray(specificDates)
      && specificDates.some((dateValue) => toYmdDateString(dateValue, timeZone) === today);
  }

  return false;
};

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

/**
 * Calculates the end date of a reminder schedule based on start date and duration in days.
 * Returns YYYY-MM-DD string or null if duration is invalid or ongoing.
 */
const calculateEndDate = (startDateStr, durationDays) => {
  if (!durationDays || Number(durationDays) <= 0) return null;
  const baseDate = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(baseDate.getTime())) return null;
  baseDate.setDate(baseDate.getDate() + Number(durationDays));
  return baseDate.toISOString().split("T")[0];
};

const IGNORE_WORDS = new Set([
  "take", "morning", "afternoon", "evening", "night", "midnight", "bedtime",
  "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "cap", "caps",
  "pill", "pills", "drop", "drops", "syrup", "injection", "iv", "oral", "sublingual",
  "daily", "every", "hours", "hour", "hr", "hrs", "with", "food", "after",
  "meals", "meal", "before", "once", "twice", "thrice", "slot", "medication",
  "medicine", "prescribed", "prescription", "drug", "dose", "dosage", "label",
  "auto", "generated", "ocr", "review", "am", "pm", "day", "days", "week",
  "weeks", "month", "months", "ongoing", "continuous", "step", "time", "times",
  "med", "meds", "first", "second", "third", "fourth", "1", "2", "3", "4", "0",
  "vitamin", "supplement", "extract", "oil", "gel", "cream", "spray", "inhaler",
  "powder", "solution", "suspension", "lotion", "ointment", "liquid", "mg", "ml", "mcg", "g", "l", "iu"
]);

const isDosageOrNumber = (str = "") => {
  if (/^\d+(?:\.\d+)?(?:mg|ml|mcg|g|kg|l|iu|%|meq|cc|u)?$/i.test(str)) return true;
  if (/^(?:mg|ml|mcg|g|kg|l|iu|%|meq|cc|u)$/i.test(str)) return true;
  if (/^\d+$/i.test(str)) return true;
  return false;
};

const getDrugKeywords = (title = "") => {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !IGNORE_WORDS.has(w) && !isDosageOrNumber(w));
};

const keywordsMatch = (kw1 = [], kw2 = []) => {
  if (!kw1.length || !kw2.length) return false;
  for (const w1 of kw1) {
    for (const w2 of kw2) {
      if (w1 === w2) return true;
      if (w1.length >= 4 && w2.length >= 4 && (w1.includes(w2) || w2.includes(w1))) return true;
      if (w1.length >= 3 && w2.length >= 3 && (w1.startsWith(w2) || w2.startsWith(w1))) return true;
    }
  }
  return false;
};

const getTimeDifferenceMinutes = (t1, t2) => {
  if (!t1 || !t2) return 0;
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  const mins1 = h1 * 60 + m1;
  const mins2 = h2 * 60 + m2;
  const diff = Math.abs(mins1 - mins2);
  return Math.min(diff, 1440 - diff);
};

/**
 * Checks if a new reminder is a duplicate of an existing active reminder.
 * Matches drug keywords (ignoring dosage/form words) and checks if scheduled times are within 3 hours.
 */
const checkMedicationDuplicate = (newReminder, existingReminders = [], allNewReminders = []) => {
  if (!newReminder || !existingReminders.length) return null;
  
  const newTitle = typeof newReminder === "string" ? newReminder : (newReminder.title || "");
  const newTime = typeof newReminder === "string" ? "08:00" : (newReminder.time || "08:00");
  const newKeywords = getDrugKeywords(newTitle);
  
  const countInNew = allNewReminders.filter(r => {
    const title = typeof r === "string" ? r : (r.title || "");
    const kw = getDrugKeywords(title);
    return keywordsMatch(newKeywords, kw);
  }).length;
  
  for (const existing of existingReminders) {
    if (!existing.title) continue;
    const existingKeywords = getDrugKeywords(existing.title);
    const existingTime = existing.time || "08:00";
    
    let isNameMatch = false;
    if (newKeywords.length > 0 && existingKeywords.length > 0) {
      isNameMatch = keywordsMatch(newKeywords, existingKeywords);
    } else {
      isNameMatch = newTitle.toLowerCase().trim() === existing.title.toLowerCase().trim();
    }
    
    if (isNameMatch) {
      const timeDiff = getTimeDifferenceMinutes(newTime, existingTime);
      
      if (timeDiff <= 180) {
        return existing;
      }
      
      const countInExisting = existingReminders.filter(r => {
        const kw = getDrugKeywords(r.title);
        return keywordsMatch(newKeywords, kw);
      }).length;
      
      if (countInNew <= 1 && countInExisting <= 1) {
        return existing;
      }
    }
  }
  return null;
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

  const durationDays = Number(reminderPayload.durationDays || req.body.durationDays || 0);
  const endDate = calculateEndDate(scheduleFields.date || formatDateToYMD(new Date()), durationDays);

  const reminder = await Reminder.create({
    ...reminderPayload,
    ...scheduleFields,
    durationDays,
    endDate,
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
    // Ensure transient `isDisabledToday` flags don't persist beyond the day they were set.
    // If `isDisabledToday` is true but the reminder was last updated on a previous day
    // (in the reminder's timezone), clear the flag so the reminder becomes normal the next day.
    const todayResetIds = [];

    const remindersWithUiState = (await Promise.all(reminders.map(async (reminder) => {
      const timeZone = reminder.timezone || DEFAULT_TIME_ZONE;
      const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);

      // Check if reminder has expired based on duration/endDate
      if (reminder.endDate && todayDate > reminder.endDate) {
        if (reminder.isActive !== false) {
          await Reminder.updateOne({ _id: reminder._id }, { $set: { isActive: false } }).catch(() => {});
        }
        return {
          ...reminder,
          isActive: false,
          disabledToday: true,
          status: "completed",
        };
      }

      // If flag is set, check whether it was set today in the same timezone.
      let isDisabledFlag = Boolean(reminder.isDisabledToday);
      if (isDisabledFlag) {
        const updatedAt = reminder.updatedAt ? new Date(reminder.updatedAt) : null;
        if (updatedAt) {
          const updatedYmd = formatDateToYMDInTimeZone(updatedAt, timeZone);
          if (updatedYmd !== todayDate) {
            // stale flag — schedule to reset in DB and treat as not disabled for UI
            todayResetIds.push(reminder._id);
            isDisabledFlag = false;
          }
        } else {
          // no updatedAt available — be conservative and reset the flag
          todayResetIds.push(reminder._id);
          isDisabledFlag = false;
        }
      }

      const disabledToday = isDisabledFlag || getReminderDisabledDates(reminder).includes(todayDate);

      return {
        ...reminder,
        disabledToday,
        status: disabledToday ? "skipped" : "pending",
      };
    })));

    if (todayResetIds.length > 0) {
      // Bulk clear stale flags so subsequent requests see the correct state.
      try {
        await Reminder.updateMany({ _id: { $in: todayResetIds } }, { $set: { isDisabledToday: false } });
      } catch (err) {
        // don't fail the request if clearing flags fails; log for later debugging
        // eslint-disable-next-line no-console
        console.error('Failed to clear stale isDisabledToday flags:', err?.message || err);
      }
    }

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
    "instruction",
    "durationDays",
    "endDate",
    "category",
    "time",
    "disabledDates",
    "isActive",
    "timezone",
    "isDisabledToday",
    "snoozedUntil",
    "completionHistory",
  ];

  const previousDisabledDates = getReminderDisabledDates(reminder);

  allowedFields.forEach((field) => {
    if (hasOwn(req.body, field)) {
      reminder[field] = req.body[field];
    }
  });

  if (hasOwn(req.body, "durationDays")) {
    const dur = Number(req.body.durationDays || 0);
    reminder.durationDays = dur;
    reminder.endDate = calculateEndDate(reminder.date || formatDateToYMD(new Date()), dur);
  }

  const updatedReminder = await reminder.save();

  if (hasOwn(req.body, "disabledDates") || hasOwn(req.body, "isDisabledToday")) {
    const timeZone = updatedReminder.timezone || reminder.timezone || DEFAULT_TIME_ZONE;
    const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);
    const hasTodayAfter = getReminderDisabledDates(updatedReminder).includes(todayDate)
      || Boolean(updatedReminder.isDisabledToday);

    await Reminder.updateOne(
      { _id: reminderId },
      { $set: { isDisabledToday: hasTodayAfter } }
    );
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

const uploadPrescription = async (req, res) => {
  const userId = getRequestUserId(req);

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  if (!req.file) {
    return res.status(400).json(apiFail("Prescription file is required."));
  }

  try {
    const parsedReminders = await analyzePrescription(req.file.buffer, req.file.mimetype, req.file.originalname);
    const existingReminders = await Reminder.find({ userId, isActive: { $ne: false } }).lean();
    
    const validatedReminders = [];
    for (const reminderData of parsedReminders) {
      const scheduleFields = buildScheduleFields({
        source: reminderData,
        timeZone: req.body.timezone || DEFAULT_TIME_ZONE,
        requireFrequency: true,
      });

      if (scheduleFields.error) {
        continue; // skip invalid parsed reminder
      }

      const duplicateExisting = checkMedicationDuplicate(reminderData, existingReminders, parsedReminders);
      const isDuplicate = Boolean(duplicateExisting);
      const duplicateMessage = isDuplicate
        ? `Duplicate Detected: You already have an active reminder "${duplicateExisting.title}" (${duplicateExisting.time}).`
        : "";

      const durationDays = Number(reminderData.durationDays || 0);
      const endDate = calculateEndDate(scheduleFields.date || formatDateToYMDInTimeZone(new Date(), req.body.timezone || DEFAULT_TIME_ZONE), durationDays);

      validatedReminders.push({
        ...reminderData,
        ...scheduleFields,
        durationDays,
        endDate,
        isDuplicate,
        duplicateMessage,
        createdFrom: "prescription",
      });
    }

    return res.status(200).json(
      apiSuccess(
        { reminders: validatedReminders },
        "Prescription parsed successfully. Please review the generated reminders."
      )
    );
  } catch (error) {
    return res.status(400).json(apiFail(error.message || "Failed to process prescription."));
  }
};

 module.exports = {
   createReminder,
   getTodayReminders,
   updateReminder,
   deleteReminder,
   uploadPrescription,
 };
