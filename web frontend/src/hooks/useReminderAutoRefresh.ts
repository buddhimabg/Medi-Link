import { useEffect, useRef } from "react";

type RefreshCallback = () => void | Promise<void>;

type ReminderAutoRefreshOptions = {
  intervalMs?: number;
  refreshOnFocus?: boolean;
  refreshOnVisibility?: boolean;
  refreshOnMidnight?: boolean;
  initialRefresh?: boolean;
};

const getMsUntilNextMidnight = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime() - now.getTime();
};

export default function useReminderAutoRefresh(
  refresh: RefreshCallback,
  options: ReminderAutoRefreshOptions = {}
) {
  const {
    intervalMs = 0,
    refreshOnFocus = true,
    refreshOnVisibility = true,
    refreshOnMidnight = true,
    initialRefresh = true,
  } = options;

  const refreshRef = useRef(refresh);

  const lastTriggeredRef = useRef<number>(0);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let midnightTimeoutId: number | undefined;

    const triggerRefresh = () => {
      const now = Date.now();
      if (now - lastTriggeredRef.current < 1000) {
        return;
      }
      lastTriggeredRef.current = now;
      void refreshRef.current();
    };

    const scheduleMidnightRefresh = () => {
      if (!refreshOnMidnight) {
        return;
      }

      const delay = getMsUntilNextMidnight();

      midnightTimeoutId = window.setTimeout(() => {
        triggerRefresh();
        scheduleMidnightRefresh();
      }, delay);
    };

    if (initialRefresh) {
      triggerRefresh();
    }

    const intervalId = intervalMs > 0 ? window.setInterval(triggerRefresh, intervalMs) : undefined;
    const handleFocus = () => {
      if (refreshOnFocus) {
        triggerRefresh();
      }
    };
    const handleVisibilityChange = () => {
      if (refreshOnVisibility && document.visibilityState === "visible") {
        triggerRefresh();
      }
    };

    if (refreshOnFocus) {
      window.addEventListener("focus", handleFocus);
    }

    if (refreshOnVisibility) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    scheduleMidnightRefresh();

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (midnightTimeoutId) {
        window.clearTimeout(midnightTimeoutId);
      }

      if (refreshOnFocus) {
        window.removeEventListener("focus", handleFocus);
      }

      if (refreshOnVisibility) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [initialRefresh, intervalMs, refreshOnFocus, refreshOnMidnight, refreshOnVisibility]);
}