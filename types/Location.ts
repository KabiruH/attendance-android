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