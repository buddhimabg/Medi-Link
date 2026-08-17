export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'patient' | 'admin';
  profileImage?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface DoctorProfile extends User {
  specialization: string;
  licenseNumber: string;
  experience: number;
  rating?: number;
  reviewsCount?: number;
}

export type MenuItem = 'Dashboard' | 'Schedule' | 'Patient' | 'Settings';