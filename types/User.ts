// types/User.ts
export interface User {
  id: number;
  name: string;
  id_number: string;
  role: string;
  phone_number: string;
  department?: string;
  gender: string;
  email?: string;
  is_active: boolean;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  date_of_birth: string;
  employee_id: number;
}

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

// types/Location.ts
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationResult {
  success: boolean;
  location?: LocationData;
  withinGeofence?: boolean;
  error?: string;
  distance?: number;
}

// types/Attendance.ts
export interface AttendanceSession {
  check_in_time?: string;
  check_out_time?: string;
  type: string;
  location?: LocationData;
  ip_address?: string;
  user_agent?: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  sessions: AttendanceSession[];
  status: 'Present' | 'Late' | 'Absent';
}

export interface AttendanceRequest {
  type: 'work_checkin' | 'work_checkout' | 'class_checkin' | 'class_checkout';
  location: LocationData;
  biometric_verified: boolean;
  class_id?: number;
}

export interface AttendanceResponse {
  today: {
    work_attendance: Attendance | null;
    class_attendance: ClassAttendance[];
    is_checked_in: boolean;
  };
  history: Attendance[];
  current_date: string;
}

// types/Classes.ts
export interface Class {
  id: number;
  name: string;
  code: string;
  description?: string;
  department: string;
  duration_hours: number;
  is_active: boolean;
  assigned_at: string;
  attendance_status: {
    checked_in: boolean;
    checked_out: boolean;
    check_in_time?: string;
    check_out_time?: string;
    status: string;
  };
}

export interface ClassAttendance {
  id: number;
  trainer_id: number;
  class_id: number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  auto_checkout: boolean;
  class: {
    name: string;
    code: string;
    duration_hours: number;
  };
}

// types/API.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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

// types/Navigation.ts
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  BiometricSetup: {
    user: User;
    employee: Employee | null;
    token: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Classes: undefined;
  Profile: undefined;
};

// types/index.ts - Export all types
export * from './User';
export * from './Auth';
export * from './Location';
export * from './Attendance';
export * from './Classes';
export * from './API';
export * from './Navigation';