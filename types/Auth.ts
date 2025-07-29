import { Employee, User } from "./User";

// types/Auth.ts
export interface LoginRequest {
  id_number: string;
}

export interface LoginResponse {
  user: User;
  employee: Employee | null;
  token: string;
  biometric_enrolled: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  employee: Employee | null;
  token: string | null;
  biometricEnrolled: boolean;
  loading: boolean;
}
