// types/API.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

export interface BiometricStatus {
  enrolled: boolean;
  supported: boolean;
  deviceEnrolled: boolean;
}
