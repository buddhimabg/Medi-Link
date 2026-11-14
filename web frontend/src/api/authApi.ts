import client from "./client";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  gender?: string;
  city?: string;
  dob?: string;
};

export const login = async (payload: LoginPayload) => {
  return client.post("/api/auth/login", payload);
};

export const register = async (payload: RegisterPayload) => {
  return client.post("/api/auth/register", payload);
};