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
  });
};

export const fetchReportHistory = async (userId: string): Promise<any> => {
  return client.get(API_CONFIG.ENDPOINTS.reportHistory(userId));
};

export const fetchReportById = async (reportId: string): Promise<any> => {
  return client.get(API_CONFIG.ENDPOINTS.reportDetail(reportId));
};
