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
    is_checked_in: boolean;
    class_attendance: ClassAttendance[];
    active_class_session?: {  // Add this optional property
      id: number;
      class_id: number;
      check_in_time: Date | string;
      class_name?: string;
    } | null;
  };
  history: Attendance[];
  classHistory?: ClassAttendance[];  // Add this optional property
  current_date: string;
}