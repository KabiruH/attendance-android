// services/StorageService.ts - FIXED VERSION
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/Storage';
import { User, Employee } from '../types/User';

export class StorageService {
  // Secure storage methods for sensitive data - FIXED API CALLS
  static async setSecureItem(key: string, value: string): Promise<void> {
    try {
      // FIXED: Use the correct API method
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error storing secure item:', error);
      throw new Error('Failed to store secure data');
    }
  }

  static async getSecureItem(key: string): Promise<string | null> {
    try {
      // FIXED: Use the correct API method
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      return null;
    }
  }

  static async deleteSecureItem(key: string): Promise<void> {
    try {
      // FIXED: Use the correct API method
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error deleting secure item:', error);
    }
  }

  // Regular storage methods for non-sensitive data
  static async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error storing item:', error);
      throw new Error('Failed to store data');
    }
  }

  static async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving item:', error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  // Authentication specific methods
  static async saveUserToken(token: string): Promise<void> {
    await this.setSecureItem(STORAGE_KEYS.USER_TOKEN, token);
  }

  static async getUserToken(): Promise<string | null> {
    return await this.getSecureItem(STORAGE_KEYS.USER_TOKEN);
  }

  static async clearUserToken(): Promise<void> {
    await this.deleteSecureItem(STORAGE_KEYS.USER_TOKEN);
  }

  static async saveUserData(user: User): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_DATA, user);
  }

  static async getUserData(): Promise<User | null> {
    return await this.getItem<User>(STORAGE_KEYS.USER_DATA);
  }

  static async saveEmployeeData(employee: Employee): Promise<void> {
    await this.setItem(STORAGE_KEYS.EMPLOYEE_DATA, employee);
  }

  static async getEmployeeData(): Promise<Employee | null> {
    return await this.getItem<Employee>(STORAGE_KEYS.EMPLOYEE_DATA);
  }

  static async setBiometricEnrolled(enrolled: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.BIOMETRIC_ENROLLED, enrolled);
  }

  static async getBiometricEnrolled(): Promise<boolean> {
    const enrolled = await this.getItem<boolean>(STORAGE_KEYS.BIOMETRIC_ENROLLED);
    return enrolled || false;
  }

  // Location methods
  static async saveLastLocation(location: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_LOCATION, {
      ...location,
      timestamp: Date.now(),
    });
  }

  static async getLastLocation(): Promise<any> {
    return await this.getItem(STORAGE_KEYS.LAST_LOCATION);
  }

  // Cache methods for offline support
  static async cacheAttendanceData(data: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.ATTENDANCE_CACHE, {
      data,
      timestamp: Date.now(),
    });
  }

  static async getCachedAttendanceData(): Promise<any> {
    const cached = await this.getItem(STORAGE_KEYS.ATTENDANCE_CACHE);
    if (!cached) return null;
    
    // Check if cache is less than 1 hour old
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - cached.timestamp < oneHour) {
      return cached.data;
    }
    
    return null;
  }

  // Clear all user data (for logout)
  static async clearAllUserData(): Promise<void> {
    try {
      await Promise.all([
        this.clearUserToken(),
        this.removeItem(STORAGE_KEYS.USER_DATA),
        this.removeItem(STORAGE_KEYS.EMPLOYEE_DATA),
        this.removeItem(STORAGE_KEYS.BIOMETRIC_ENROLLED),
        this.removeItem(STORAGE_KEYS.ATTENDANCE_CACHE),
        // Keep last location and settings for convenience
      ]);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  // Settings methods
  static async saveSettings(settings: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  static async getSettings(): Promise<any> {
    return await this.getItem(STORAGE_KEYS.SETTINGS) || {
      notifications: true,
      locationTracking: true,
      biometricRequired: true,
      theme: 'light',
    };
  }

  // Debug method to check all stored data
  static async getAllStoredData(): Promise<any> {
    try {
      const [
        token,
        userData,
        employeeData,
        biometricEnrolled,
        lastLocation,
        settings,
        attendanceCache,
      ] = await Promise.all([
        this.getUserToken(),
        this.getUserData(),
        this.getEmployeeData(),
        this.getBiometricEnrolled(),
        this.getLastLocation(),
        this.getSettings(),
        this.getCachedAttendanceData(),
      ]);

      return {
        hasToken: !!token,
        userData,
        employeeData,
        biometricEnrolled,
        lastLocation,
        settings,
        hasCachedAttendance: !!attendanceCache,
      };
    } catch (error) {
      console.error('Error getting all stored data:', error);
      return {};
    }
  }
}