import { ClassAttendance } from "./Classes";
import { LocationData } from "./Location";

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