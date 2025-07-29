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








