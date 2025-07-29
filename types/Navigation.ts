import { Employee, User } from "./User";

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