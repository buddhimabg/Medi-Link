const DEFAULT_REMINDER_TIMEZONE = "Asia/Colombo";

type ReminderLike = {
  _id?: string;
  date?: string;
  time?: string;
  frequency?: string;
  daysOfWeek?: number[];
  specificDates?: string[];
  customDates?: string[];
  timezone?: string;
};

export const formatDateYMDInTimeZone = (date: Date, timeZone = DEFAULT_REMINDER_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const dateParts = parts.reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

export const normalizeReminderFrequency = (value: unknown) => {
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

  if (["specific", "custom", "specific_dates", "specific_dates_of_month", "specific date", "specific dates"].includes(normalized)) {
    return "specific";
  }

  return "daily";
};

export const normalizeDateString = (value: unknown, timeZone = DEFAULT_REMINDER_TIMEZONE) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const canonicalMatch = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);

    if (canonicalMatch) {
      const [, year, month, day] = canonicalMatch;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsedDate = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return formatDateYMDInTimeZone(parsedDate, timeZone);
};

export const getTodayYmdLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
