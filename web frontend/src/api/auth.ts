import { apiFetch, setAuthToken } from './api';
import type { LoginFormData } from '../types/auth';

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Record<string, any>;
}

export const login = async (data: LoginFormData): Promise<LoginResponse> => {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      password: data.password
    })
  });

  if (response.token) {
    setAuthToken(response.token);
  }

  return response;
};
