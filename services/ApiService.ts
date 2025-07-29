// services/ApiService.ts - Updated with correct endpoints and classes methods
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG } from '../constants';
import { ApiResponse, LoginRequest, LoginResponse } from '../types/index';
import { StorageService } from './StorageService';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await StorageService.getUserToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        console.error('API Error:', error.response?.data || error.message);
        
        // Handle token expiration
        if (error.response?.status === 401) {
          await StorageService.clearAllUserData();
          // You might want to navigate to login here
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Generic API methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(endpoint);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put(endpoint, data);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete(endpoint);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Authentication methods
  async mobileLogin(idNumber: string): Promise<ApiResponse<LoginResponse>> {
    const loginData: LoginRequest = {
      id_number: idNumber.trim(),
    };
    
    return this.post<LoginResponse>(
      '/api/auth/mobile-login',
      loginData
    );
  }

  async getUserProfile(): Promise<ApiResponse> {
    return this.get('/api/user/profile');
  }

  // Attendance methods
  async getAttendanceData(): Promise<ApiResponse> {
    return this.get('/api/attendance/mobile');
  }

  async submitAttendance(attendanceData: any): Promise<ApiResponse> {
    return this.post('/api/attendance/mobile', attendanceData);
  }

  async getAttendanceStatus(): Promise<ApiResponse> {
    return this.get('/api/attendance/status');
  }

  // Classes methods
  async getAssignedClasses(): Promise<ApiResponse> {
    return this.get('/api/classes/assigned');
  }

  async getAllClasses(activeOnly: boolean = false): Promise<ApiResponse> {
    const endpoint = `/api/classes${activeOnly ? '?active_only=true' : ''}`;
    return this.get(endpoint);
  }

  async getClassById(classId: number): Promise<ApiResponse> {
    return this.get(`/api/classes/${classId}`);
  }

  async createClass(classData: {
    name: string;
    code: string;
    description?: string;
    department: string;
    duration_hours?: number;
  }): Promise<ApiResponse> {
    return this.post('/api/classes', classData);
  }

  async updateClass(classData: {
    id: number;
    name: string;
    code: string;
    description?: string;
    department: string;
    duration_hours?: number;
    is_active?: boolean;
  }): Promise<ApiResponse> {
    return this.put('/api/classes', classData);
  }

  async deleteClass(classId: number): Promise<ApiResponse> {
    return this.delete(`/api/classes/${classId}`);
  }

  // Class attendance methods
  async submitClassAttendance(attendanceData: {
    type: 'class_checkin' | 'class_checkout';
    class_id: number;
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
    };
    biometric_verified: boolean;
  }): Promise<ApiResponse> {
    return this.post('/api/attendance/mobile', attendanceData);
  }

  async getClassAttendanceHistory(classId?: number): Promise<ApiResponse> {
    const endpoint = classId 
      ? `/api/attendance/class/${classId}` 
      : '/api/attendance/class';
    return this.get(endpoint);
  }

  // Biometric methods
  async enrollBiometric(biometricData: any): Promise<ApiResponse> {
    return this.post('/api/biometric/enroll', biometricData);
  }

  async getBiometricStatus(): Promise<ApiResponse> {
    return this.get('/api/biometric/status');
  }

  async verifyBiometric(biometricData: any): Promise<ApiResponse> {
    return this.post('/api/biometric/verify', biometricData);
  }

  // User management methods
  async updateProfile(profileData: any): Promise<ApiResponse> {
    return this.put('/api/user/profile', profileData);
  }

  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> {
    return this.post('/api/user/change-password', passwordData);
  }

  // Reports and analytics
  async getAttendanceReport(params?: {
    startDate?: string;
    endDate?: string;
    employeeId?: number;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.employeeId) queryParams.append('employee_id', params.employeeId.toString());
    
    const endpoint = `/api/reports/attendance${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.get(endpoint);
  }

  async getClassReport(classId: number, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    
    const endpoint = `/api/reports/class/${classId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.get(endpoint);
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse> {
    return this.get('/api/notifications');
  }

  async markNotificationAsRead(notificationId: number): Promise<ApiResponse> {
    return this.put(`/api/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.put('/api/notifications/read-all');
  }

  // Settings
  async getAppSettings(): Promise<ApiResponse> {
    return this.get('/api/settings');
  }

  async updateAppSettings(settings: any): Promise<ApiResponse> {
    return this.put('/api/settings', settings);
  }

  // Error handling
  private handleError(error: any): ApiResponse {
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.error || 
                          error.response.data?.message || 
                          'Server error occurred';
      
      return {
        success: false,
        error: errorMessage,
        status: error.response.status,
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        error: 'Network error. Please check your internet connection.',
      };
    } else {
      // Other error
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Utility methods
  updateBaseURL(newBaseURL: string): void {
    this.api.defaults.baseURL = newBaseURL;
  }

  setTimeout(timeout: number): void {
    this.api.defaults.timeout = timeout;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.get('/api/health');
  }

  // Logout
  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.post('/api/auth/logout');
      await StorageService.clearAllUserData();
      return response;
    } catch (error: any) {
      // Even if logout fails on server, clear local data
      await StorageService.clearAllUserData();
      return this.handleError(error);
    }
  }
}

export const apiService = new ApiService();