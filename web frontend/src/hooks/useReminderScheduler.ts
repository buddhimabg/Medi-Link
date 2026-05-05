import { useEffect, useRef } from "react";

type Frequency = "once" | "daily" | "weekly";

export interface Reminder {
  _id: string;
  title: string;
  description?: string;
  dateTime: string; // ISO string
  frequency: Frequency;
  isActive: boolean;
  lastTriggeredAt?: string;
}

/**
 * Minimal reminder scheduler hook.
 * - Schedules future reminders with setTimeout
 * - Triggers missed reminders on load
 * - Respects `isActive` and valid dates
 */
export default function useReminderScheduler(reminders: Reminder[] = []) {
  const timersRef = useRef<Map<string, number>>(new Map());
  const localTriggeredRef = useRef<Set<string>>(new Set());

  const clearAllTimers = () => {
    timersRef.current.forEach((id) => {
      clearTimeout(id);
    });
    timersRef.current.clear();
  };

  const parseDate = (iso?: string): Date | null => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const computeNextOccurrence = (base: Date, freq: Frequency, after?: Date): Date | null => {
    if (freq === "once") return null;
    const now = after ?? new Date();
    const next = new Date(base.getTime());
    const stepDays = freq === "daily" ? 1 : 7;
    let safety = 0;
    while (next.getTime() <= now.getTime() && safety < 1000) {
      next.setDate(next.getDate() + stepDays);
      safety += 1;
    }
    return safety >= 1000 ? null : next;
  };

  const showReminder = (reminder: Reminder) => {
    // Replaceable: currently console + alert
    // eslint-disable-next-line no-console
    console.log("Reminder fired:", reminder.title, reminder.description || "");
    // eslint-disable-next-line no-alert
    alert(`Reminder: ${reminder.title}${reminder.description ? "\n\n" + reminder.description : ""}`);
  };

  const triggerReminderAt = (reminder: Reminder, scheduledDate: Date) => {
    const lastTriggered = reminder.lastTriggeredAt ? parseDate(reminder.lastTriggeredAt) : null;
    if (lastTriggered && lastTriggered.getTime() >= scheduledDate.getTime()) return;

    const localKey = `${reminder._id}:${scheduledDate.toISOString()}`;
    if (localTriggeredRef.current.has(localKey)) return;
    localTriggeredRef.current.add(localKey);

    showReminder(reminder);
  };

  const scheduleForDate = (reminder: Reminder, targetDate: Date) => {
    const now = Date.now();
    const delay = targetDate.getTime() - now;
    const idKey = reminder._id;

    if (delay <= 0) {
      triggerReminderAt(reminder, targetDate);
      if (reminder.frequency !== "once") {
        const next = computeNextOccurrence(targetDate, reminder.frequency, new Date());
        if (next) {
          const nextDelay = Math.max(0, next.getTime() - Date.now());
          const t = window.setTimeout(() => {
            triggerReminderAt(reminder, next);
            scheduleRecurring(reminder, next);
          }, nextDelay);
          timersRef.current.set(idKey, t);
        }
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      triggerReminderAt(reminder, targetDate);
      if (reminder.frequency !== "once") {
        scheduleRecurring(reminder, targetDate);
      }
      timersRef.current.delete(idKey);
    }, delay);

    timersRef.current.set(idKey, timeoutId);
  };

  const scheduleRecurring = (reminder: Reminder, firedDate: Date) => {
    const next = computeNextOccurrence(firedDate, reminder.frequency, new Date());
    if (!next) return;
    const idKey = reminder._id;
    const delay = Math.max(0, next.getTime() - Date.now());
    const timeoutId = window.setTimeout(() => {
      triggerReminderAt(reminder, next);
      scheduleRecurring(reminder, next);
      timersRef.current.delete(idKey);
    }, delay);
    timersRef.current.set(idKey, timeoutId);
  };

  useEffect(() => {
    clearAllTimers();

    if (!Array.isArray(reminders) || reminders.length === 0) return undefined;

    const now = new Date();

    reminders.forEach((r) => {
      if (!r || !r.isActive) return;
      const scheduled = parseDate(r.dateTime);
      if (!scheduled) return;

      if (scheduled.getTime() <= now.getTime()) {
        const lastTriggered = r.lastTriggeredAt ? parseDate(r.lastTriggeredAt) : null;
        if (!lastTriggered || lastTriggered.getTime() < scheduled.getTime()) {
          triggerReminderAt(r, scheduled);
        }
        if (r.frequency !== "once") {
          const next = computeNextOccurrence(scheduled, r.frequency, now);
          if (next) scheduleForDate(r, next);
        }
      } else {
        scheduleForDate(r, scheduled);
      }
    });

    return () => {
      clearAllTimers();
    };
    // stringify for shallow deep-compare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(reminders)]);

  useEffect(() => () => clearAllTimers(), []);
}
