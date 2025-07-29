// services/AttendanceService.ts - Updated to work with your existing ApiService
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { apiService } from './ApiService';

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface AttendanceRequest {
  type: 'work_checkin' | 'work_checkout' | 'class_checkin' | 'class_checkout';
  location: AttendanceLocation;
  biometric_verified: boolean;
  class_id?: number;
}

export interface LocationResult {
  success: boolean;
  location?: AttendanceLocation;
  withinGeofence?: boolean;
  distance?: number;
  error?: string;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
}

class AttendanceService {
  // School geofence configuration
  private readonly GEOFENCE = {
    latitude: -1.22486,
    longitude: 36.70958,
    radius: 50, // meters
  };

  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationResult> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Location permission denied',
        };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        // timeout: 10000,
      });

      const attendanceLocation: AttendanceLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: Date.now(),
      };

      const distance = this.calculateDistanceFromSchool(
        location.coords.latitude,
        location.coords.longitude
      );

      const withinGeofence = distance <= this.GEOFENCE.radius;

      return {
        success: true,
        location: attendanceLocation,
        withinGeofence,
        distance,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return {
        success: false,
        error: 'Could not get your current location. Please enable location services.',
      };
    }
  }

  async verifyBiometric(promptMessage?: string): Promise<BiometricResult> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          success: false,
          error: 'Biometric hardware not available on this device',
        };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return {
          success: false,
          error: 'No biometric data enrolled. Please set up fingerprint or face recognition in device settings.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Verify your identity to mark attendance',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Biometric authentication failed or was cancelled',
        };
      }
    } catch (error) {
      console.error('Error verifying biometric:', error);
      return {
        success: false,
        error: 'Biometric verification failed',
      };
    }
  }

  async markAttendance(
    type: 'work_checkin' | 'work_checkout' | 'class_checkin' | 'class_checkout',
    classId?: number
  ) {
    try {
      // Step 1: Get current location
      const locationResult = await this.getCurrentLocation();
      if (!locationResult.success || !locationResult.location) {
        return {
          success: false,
          error: locationResult.error || 'Could not get your current location',
        };
      }

      // Step 2: Check if within geofence
      if (!locationResult.withinGeofence) {
        return {
          success: false,
          error: `You must be within the school premises to mark attendance. You are ${Math.round(locationResult.distance || 0)}m away.`,
          distance: locationResult.distance,
        };
      }

      // Step 3: Verify biometric
      const biometricResult = await this.verifyBiometric(
        `Verify your identity to ${type.replace('_', ' ')}`
      );
      
      if (!biometricResult.success) {
        return {
          success: false,
          error: biometricResult.error || 'Biometric verification is required',
        };
      }

      // Step 4: Prepare request data
      const requestData: AttendanceRequest = {
        type,
        location: locationResult.location,
        biometric_verified: true,
        ...(classId && { class_id: classId }),
      };

      // Step 5: Submit to API using your existing service
      const response = await apiService.submitAttendance(requestData);
      return response;

    } catch (error) {
      console.error('Error marking attendance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark attendance',
      };
    }
  }

  async getAttendanceStatus() {
    try {
      return await apiService.getAttendanceData();
    } catch (error) {
      console.error('Error getting attendance status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get attendance status',
      };
    }
  }

  // Helper method to calculate distance from school
  calculateDistanceFromSchool(latitude: number, longitude: number): number {
    return this.calculateDistance(
      latitude,
      longitude,
      this.GEOFENCE.latitude,
      this.GEOFENCE.longitude
    );
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Method to get supported biometric types
  async getSupportedBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  // Method to check if biometric is available and enrolled
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }
}

export const attendanceService = new AttendanceService();