import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import { API_CONFIG } from "../config";

interface ApiPayload {
  success: boolean;
  message?: string;
  data?: unknown;
  details?: unknown;
  [key: string]: unknown;
}

interface CustomError extends Error {
  type: string;
  status: number;
  code?: string;
  details: unknown;
}

const client: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.response.use(
  (response: AxiosResponse<ApiPayload>): AxiosResponse | any => {
    const payload = response?.data;

    if (payload && typeof payload === "object" && "success" in payload) {
      if (!payload.success) {
        const error = new Error(payload.message || "Request failed") as CustomError;
        error.type = "ApiError";
        error.status = response.status;
        error.code = (payload.code as string) || undefined;
        error.details = payload.details || null;
        throw error;
      }
      const { success, message, data, ...extra } = payload;
      if (data && typeof data === "object") {
        return Object.keys(extra).length ? { ...data, ...extra } : data;
      }
      return Object.keys(extra).length ? { data, ...extra } : data;
    }

    return payload;
  },
  (error: any) => {
    if (error?.response) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Request failed";
      const customError = new Error(message) as CustomError;
      customError.type =
        error.response.status >= 500 ? "ServerError" : "ValidationError";
      customError.status = error.response.status;
      customError.code = error.response?.data?.code || undefined;
      customError.details = error.response?.data?.details || null;
      throw customError;
    }

    if (error?.request) {
      // Distinguish timeout from true network failure
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        const customError = new Error("Request timed out. The AI service may be busy — please try again.") as CustomError;
        customError.type = "TimeoutError";
        customError.status = 0;
        customError.details = null;
        throw customError;
      }
      const customError = new Error("Network error. Please check your connection.") as CustomError;
      customError.type = "NetworkError";
      customError.status = 0;
      customError.details = null;
      throw customError;
    }

    const customError = new Error(error?.message || "Something went wrong") as CustomError;
    customError.type = "UnknownError";
    customError.status = 0;
    customError.details = null;
    throw customError;
  }
);

export default client;
