const fallbackMessage = "Something went wrong";

type AppError = {
  type?: string;
  message?: string;
  details?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toAppError = (err: unknown): AppError => (isObject(err) ? (err as AppError) : {});

export const getErrorMessage = (err: unknown, customFallback: string = fallbackMessage): string => {
  if (!err) return customFallback;

  const error = toAppError(err);

  if (error.type === "NetworkError") {
    return "Cannot connect to server. Please ensure backend is running on http://localhost:5000 and MongoDB is connected.";
  }

  if (error.type === "ValidationError") {
    if (Array.isArray(error.details) && error.details.length > 0) {
      const firstDetail = error.details[0];
      if (typeof firstDetail === "string") return firstDetail;
    }

    if (isObject(error.details)) {
      const first = Object.values(error.details)[0];
      if (typeof first === "string") return first;
    }

    const msg = typeof error.message === "string" && error.message !== "[object Object]" ? error.message : null;
    return msg || "Please check your input and try again.";
  }

  if (error.type === "ServerError") {
    return "Server error. Please try again in a moment.";
  }

  const msg = typeof error.message === "string" && error.message !== "[object Object]" ? error.message : null;
  return msg || customFallback;
};

export const logError = (err: unknown, context: string = "app"): void => {
  console.error(`[${context}]`, err);
};

export const handleError = (err: unknown, context?: string): string => {
  logError(err, context);
  return getErrorMessage(err);
};