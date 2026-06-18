import {
  formatDateYMDInTimeZone,
  normalizeDateString,
  normalizeReminderFrequency,
} from "./reminderSchedule";

const DEFAULT_REMINDER_TIMEZONE = "Asia/Colombo";

const WEEKDAY_NAME_TO_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export type ReminderLike = {
  _id?: string;
  title?: string;
  description?: string;
  category?: string;
  date?: string;
  time?: string;
  frequency?: string;
  daysOfWeek?: number[];
  specificDates?: string[];
  customDates?: string[];
  timezone?: string;
  disabledDates?: string[];
  disabledToday?: boolean;
  isDisabledToday?: boolean;
  status?: string;
  isActive?: boolean;
};

const getReminderTimeZone = (reminder: ReminderLike) => reminder?.timezone || DEFAULT_REMINDER_TIMEZONE;

const getTodayYmdInTimeZone = (referenceDate: Date, timeZone: string) =>
  formatDateYMDInTimeZone(referenceDate, timeZone);

const getWeekdayIndexInTimeZone = (referenceDate: Date, timeZone: string) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(referenceDate).toLowerCase();

  return WEEKDAY_NAME_TO_INDEX[weekday.slice(0, 3)];
};

const getReminderDisabledDates = (reminder: ReminderLike) =>
  Array.isArray(reminder?.disabledDates)
    ? reminder.disabledDates.map((value) => String(value).trim()).filter(Boolean)
    : [];

const getReminderSpecificDates = (reminder: ReminderLike) =>
  Array.isArray(reminder?.specificDates)
    ? reminder.specificDates
    : reminder?.customDates;

const getReminderScheduledDate = (reminder: ReminderLike, ymdDate: string) => {
  if (typeof reminder?.time !== "string") {
    return null;
  }

  const [year, month, day] = ymdDate.split("-").map((value) => Number(value));
  const [hours, minutes] = reminder.time.split(":").map((value) => Number(value));

  if (![year, month, day, hours, minutes].every((value) => Number.isFinite(value))) {
    return null;
  }

  const scheduled = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(scheduled.getTime()) ? null : scheduled;
};

const isScheduledForReferenceDay = (reminder: ReminderLike, referenceDate: Date) => {
  const timeZone = getReminderTimeZone(reminder);
  const today = getTodayYmdInTimeZone(referenceDate, timeZone);
  const normalizedFrequency = normalizeReminderFrequency(reminder?.frequency);

  if (normalizedFrequency === "once") {
    return normalizeDateString(reminder?.date, timeZone) === today;
  }

  if (normalizedFrequency === "daily") {
    return true;
  }

  if (normalizedFrequency === "weekly") {
    const todayDayIndex = getWeekdayIndexInTimeZone(referenceDate, timeZone);
    return Array.isArray(reminder?.daysOfWeek) && reminder.daysOfWeek.includes(todayDayIndex);
  }

  if (normalizedFrequency === "specific") {
    const specificDates = getReminderSpecificDates(reminder);

    if (!Array.isArray(specificDates)) {
      return false;
    }

    return specificDates.some((dateValue) => normalizeDateString(dateValue, timeZone) === today);
  }

  return false;
};

const getScheduledDateTimeForReferenceDay = (reminder: ReminderLike, referenceDate: Date) => {
  const timeZone = getReminderTimeZone(reminder);
  const today = getTodayYmdInTimeZone(referenceDate, timeZone);

  if (normalizeReminderFrequency(reminder?.frequency) === "once") {
    const onceDate = normalizeDateString(reminder?.date, timeZone);
    return onceDate ? getReminderScheduledDate(reminder, onceDate) : null;
  }

  return getReminderScheduledDate(reminder, today);
};

export const getReminderDateTime = <T extends ReminderLike>(reminder: T, referenceDate = new Date()) => {
  if (!reminder || !isScheduledForReferenceDay(reminder, referenceDate)) {
    return null;
  }

  return getScheduledDateTimeForReferenceDay(reminder, referenceDate);
};

export const isReminderOffToday = (reminder: ReminderLike, referenceDate = new Date()) => {
  const timeZone = getReminderTimeZone(reminder);
  const today = getTodayYmdInTimeZone(referenceDate, timeZone);

  return Boolean(
    reminder?.disabledToday ||
      reminder?.isDisabledToday ||
      reminder?.status === "skipped" ||
      getReminderDisabledDates(reminder).includes(today)
  );
};

export const getTodayReminders = <T extends ReminderLike>(reminders: T[], referenceDate = new Date()) =>
  reminders.filter((reminder) => reminder && isScheduledForReferenceDay(reminder, referenceDate));

export const isReminderDue = <T extends ReminderLike>(reminder: T, referenceDate = new Date()) => {
  if (!reminder || isReminderOffToday(reminder, referenceDate)) {
    return false;
  }

  const scheduledDateTime = getScheduledDateTimeForReferenceDay(reminder, referenceDate);
  return Boolean(scheduledDateTime && scheduledDateTime.getTime() <= referenceDate.getTime());
};

export const getDueReminders = <T extends ReminderLike>(reminders: T[], referenceDate = new Date()) => {
  return getTodayReminders(reminders, referenceDate)
    .filter((reminder) => isReminderDue(reminder, referenceDate))
    .sort((firstReminder, secondReminder) => {
      const firstScheduled = getScheduledDateTimeForReferenceDay(firstReminder, referenceDate)?.getTime() || 0;
      const secondScheduled = getScheduledDateTimeForReferenceDay(secondReminder, referenceDate)?.getTime() || 0;
      return secondScheduled - firstScheduled;
    });
};

export const getNextReminderOccurrence = <T extends ReminderLike>(reminder: T, referenceDate = new Date()) => {
  if (!reminder || !reminder.isActive) {
    return null;
  }

  const timeZone = getReminderTimeZone(reminder);
  const currentDate = new Date(referenceDate);
  const normalizedFrequency = normalizeReminderFrequency(reminder?.frequency);
  const scheduledToday = getScheduledDateTimeForReferenceDay(reminder, currentDate);

  if (normalizedFrequency === "once") {
    if (!scheduledToday) {
      return null;
    }

    return scheduledToday.getTime() >= currentDate.getTime() ? scheduledToday : null;
  }

  if (normalizedFrequency === "daily") {
    if (scheduledToday && scheduledToday.getTime() >= currentDate.getTime()) {
      return scheduledToday;
    }

    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayYmd = getTodayYmdInTimeZone(nextDay, timeZone);
    return getReminderScheduledDate(reminder, nextDayYmd);
  }

  if (normalizedFrequency === "weekly") {
    for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
      const candidateDate = new Date(currentDate);
      candidateDate.setDate(candidateDate.getDate() + dayOffset);

      if (!isScheduledForReferenceDay(reminder, candidateDate)) {
        continue;
      }

      const candidateScheduled = getScheduledDateTimeForReferenceDay(reminder, candidateDate);
      if (candidateScheduled && candidateScheduled.getTime() >= currentDate.getTime()) {
        return candidateScheduled;
      }
    }

    return null;
  }

  if (normalizedFrequency === "specific") {
    const specificDates = getReminderSpecificDates(reminder);

    if (!Array.isArray(specificDates) || specificDates.length === 0) {
      return null;
    }

    const futureDates = specificDates
      .map((dateValue) => normalizeDateString(dateValue, timeZone))
      .filter(Boolean)
      .sort();

    for (const dateValue of futureDates) {
      const candidate = getReminderScheduledDate(reminder, dateValue);
      if (candidate && candidate.getTime() >= currentDate.getTime()) {
        return candidate;
      }
    }

    return null;
  }

  return null;
};