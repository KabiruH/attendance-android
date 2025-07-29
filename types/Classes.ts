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