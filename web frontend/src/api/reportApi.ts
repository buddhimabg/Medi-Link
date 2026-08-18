import client from "./client";
import { API_CONFIG } from "../config";

interface UploadReportParams {
  userId: string;
  file: File;
}

export const uploadAndAnalyzeReport = async ({ userId, file }: UploadReportParams): Promise<any> => {
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("report", file);

  return client.post(API_CONFIG.ENDPOINTS.reportUpload, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000, // Allow up to 60s for full OCR extraction and rule analysis
  });
};

export const fetchReportHistory = async (userId: string, limit?: number): Promise<any> => {
  return client.get(API_CONFIG.ENDPOINTS.reportHistory(userId), {
    params: limit ? { limit } : undefined,
  });
};

export const fetchReportById = async (reportId: string): Promise<any> => {
  return client.get(API_CONFIG.ENDPOINTS.reportDetail(reportId));
};
