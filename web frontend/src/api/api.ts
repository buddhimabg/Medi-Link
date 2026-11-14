// Every call through this module targets the admin-dashboard backend,
// which is mounted at /api/admin/* (not /api/*) to avoid colliding with
// the patient-facing /api/doctors booking directory.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/admin';

export interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}

export const getAuthToken = (): string | null => {
  return window.localStorage.getItem('medilink_auth_token');
};

export const setAuthToken = (token: string): void => {
  window.localStorage.setItem('medilink_auth_token', token);
};

export const clearAuthToken = (): void => {
  window.localStorage.removeItem('medilink_auth_token');
};

export const apiFetch = async <T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<T> => {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body
  });

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
};
