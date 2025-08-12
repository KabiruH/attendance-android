// services/ApiService.ts - Updated to use unified attendance endpoint
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

async getAttendanceData(): Promise<ApiResponse> {
  try {
    // Use the unified attendance endpoint for status check
    const response = await this.get('/api/attendance');
    if (response.success) {
      const today = new Date().toISOString().split('T')[0];
      
      // Initialize default structure
      let transformedData = {
        work: {
          today: {
            work_attendance: null as any,
            is_checked_in: false
          },
          history: [] as any[],
          current_date: today
        },
        class: {
          today: {
            class_attendance: []
          },
          history: []
        }
      };

      // Cast to 'any' to fix TypeScript errors
      const responseData = (response.data || response) as any;
      
      // Now TypeScript won't complain about accessing properties
      if (responseData.role === 'employee') {
        // Extract attendance data
        const attendanceRecords = responseData.attendanceData || [];
        
        // Set the check-in status from the API response
        transformedData.work.today.is_checked_in = responseData.isCheckedIn || false;
        
        // Find today's record
        const todayRecord = attendanceRecords.find((record: any) => {
          if (!record.date) return false;
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          return recordDate === today;
        });
        
        if (todayRecord) {
          // Set today's attendance record
          transformedData.work.today.work_attendance = todayRecord;
          
          // Double-check the checked-in status based on the record
          // The API already provides isCheckedIn, but we can verify
          if (!responseData.isCheckedIn && todayRecord.check_in_time && !todayRecord.check_out_time) {
            transformedData.work.today.is_checked_in = true;
          }
        }
        
        // Set the history (all records)
        transformedData.work.history = attendanceRecords;
        
      } else if (responseData.role === 'admin') {
        // Admin sees all employee data
        transformedData.work.history = responseData.attendanceData || [];
        transformedData.work.today.is_checked_in = false; // Admins don't have personal check-in
      
        
      } else if (responseData.role === 'unauthenticated') {
        // User is not authenticated
        return {
          success: false,
          error: 'User is not authenticated'
        };
      }
      
      return {
        success: true,
        data: transformedData
      };
    }
    
    return response;
  } catch (error) {
    console.error('❌ getAttendanceData error:', error);
    return this.handleError(error);
  }
}


async submitWorkAttendance(attendanceData: {
  type: 'work_checkin' | 'work_checkout';
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  biometric_verified: boolean;
}): Promise<ApiResponse> {
  // Use the unified attendance endpoint
  return this.post('/api/attendance', attendanceData);
}

async getWorkAttendanceHistory(days: number = 7): Promise<ApiResponse> {
  // The unified route's GET endpoint returns attendance history
  return this.get('/api/attendance');
}

async submitAttendance(attendanceData: any): Promise<ApiResponse> {
  
  try {
    let response;
    
    // All work attendance goes through the unified endpoint
    if (attendanceData.type === 'work_checkin' || attendanceData.type === 'work_checkout') {
      response = await this.post('/api/attendance', attendanceData);
    } else if (attendanceData.type === 'class_checkin' || attendanceData.type === 'class_checkout') {
      // Use the class attendance endpoint if you have one
      response = await this.post('/api/attendance/class-checkin', attendanceData);
    } else {
      return {
        success: false,
        error: 'Invalid attendance type'
      };
    }
    
    return response;
  } catch (error) {
    console.error('❌ submitAttendance error:', error);
    return this.handleError(error);
  }
}

async refreshAttendanceData(): Promise<ApiResponse> {
  // Fetch fresh data
  return this.getAttendanceData();
}

async getWorkAttendanceData(): Promise<ApiResponse> {
  // Use unified endpoint for work attendance data
  return this.get('/api/attendance');
}

async getAttendanceStatus(): Promise<ApiResponse> {
  try {
    const response = await this.getWorkAttendanceData();
    
    if (response.success) {
      // Adapt the response structure to match your app's expectations
      const attendanceData = response.data?.attendanceData || [];
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendanceData.find((record: any) => 
        record.date && new Date(record.date).toISOString().split('T')[0] === today
      );

      return {
        success: true,
        data: {
          isCheckedIn: response.data?.isCheckedIn || false,
          workAttendance: todayAttendance,
          classAttendance: null, // You'll need to handle this separately
          activeClassSession: null
        }
      };
    }

    return response;
  } catch (error) {
    return this.handleError(error);
  }
}

  async getWorkAttendanceReport(params?: {
    startDate?: string;
    endDate?: string;
    employeeId?: number;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.employeeId) queryParams.append('employee_id', params.employeeId.toString());

    const endpoint = `/api/reports/work-attendance${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.get(endpoint);
  }

  async getClassAttendanceReport(params?: {
    classId?: number;
    trainerId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.classId) queryParams.append('class_id', params.classId.toString());
    if (params?.trainerId) queryParams.append('trainer_id', params.trainerId.toString());
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);

    const endpoint = `/api/reports/class-attendance${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.get(endpoint);
  }

  // Classes methods
 async getAssignedClasses(): Promise<ApiResponse> {
  try {
    console.log('📋 Fetching assigned classes...');
    
    // Get assigned classes from the classes endpoint
    const response = await this.get('/api/classes/assigned');
    
    if (!response.success) {
      // Fallback to getting from class-checkin endpoint
      const classCheckInResponse = await this.get('/api/attendance/class-checkin');

    }
    
    return response;
  } catch (error) {
    console.error('❌ getAssignedClasses error:', error);
    return this.handleError(error);
  }
}

  async getAllClasses(activeOnly: boolean = false): Promise<ApiResponse> {
    const endpoint = '/api/classes';
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

 async getClassAttendanceData(): Promise<ApiResponse> {
  try {
    console.log('📚 Fetching class attendance data...');
    
    // Use the class-checkin endpoint to get class attendance data
    const response = await this.get('/api/attendance/class-checkin');
    
    console.log('📚 Raw class attendance response:', JSON.stringify(response, null, 2));
    
    if (response.success && response.data) {
      // The response should contain today's class attendance and history
      return {
        success: true,
        data: response.data
      };
    }
    
    // If no data, return empty structure
    return {
      success: true,
      data: {
        today: {
          class_attendance: [],
          active_class_session: null
        },
        history: [],
        current_date: new Date().toISOString().split('T')[0]
      }
    };
  } catch (error) {
    console.error('❌ getClassAttendanceData error:', error);
    return this.handleError(error);
  }
}

async getClassAttendanceStatus(): Promise<ApiResponse> {
  try {
    console.log('📊 Fetching class attendance status...');
    
    // Use the class-status endpoint for detailed status
    const response = await this.get('/api/attendance/class-status');
    
    console.log('📊 Class status response:', JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error('❌ getClassAttendanceStatus error:', error);
    return this.handleError(error);
  }
}

  // Class attendance methods - these might need separate endpoints
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
  try {
    console.log('📤 Submitting class attendance:', attendanceData);
    
    // Submit to the class-checkin endpoint
    const response = await this.post('/api/attendance/class-checkin', attendanceData);
    
    console.log('📥 Class attendance response:', response);
    
    return response;
  } catch (error) {
    console.error('❌ submitClassAttendance error:', error);
    return this.handleError(error);
  }
}

async getAllAttendanceData(): Promise<ApiResponse> {
  try {
    console.log('📊 Fetching all attendance data...');
    
    // Fetch both work and class attendance in parallel
    const [workResponse, classResponse] = await Promise.all([
      this.getAttendanceData(),
      this.getClassAttendanceData()
    ]);
    
    console.log('✅ Work attendance fetched:', workResponse.success);
    console.log('✅ Class attendance fetched:', classResponse.success);
    
    if (workResponse.success && classResponse.success) {
      // Combine the data
      const combinedData = {
        work: workResponse.data?.work || {
          today: {
            work_attendance: null,
            is_checked_in: false
          },
          history: [],
          current_date: new Date().toISOString().split('T')[0]
        },
        class: classResponse.data || {
          today: {
            class_attendance: [],
            active_class_session: null
          },
          history: [],
          current_date: new Date().toISOString().split('T')[0]
        }
      };
      
      return {
        success: true,
        data: combinedData
      };
    }
    
    // Return partial data if one fails
    return {
      success: false,
      error: 'Failed to fetch complete attendance data',
      data: {
        work: workResponse.data?.work || null,
        class: classResponse.data || null
      }
    };
  } catch (error) {
    console.error('❌ getAllAttendanceData error:', error);
    return this.handleError(error);
  }
}

  async getClassAttendanceHistory(classId?: number): Promise<ApiResponse> {
    const endpoint = classId
      ? `/api/attendance/class/${classId}`
      : '/api/attendance/class';
    return this.get(endpoint);
  }

  // Refresh all attendance data after a check-in/out
async refreshAllAttendanceData(): Promise<ApiResponse> {
  console.log('🔄 Refreshing all attendance data...');
  
  // Add a small delay to ensure DB writes are complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return this.getAllAttendanceData();
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

  async mobileLoginWithPassword(idNumber: string, password: string) {
    try {
      const response = await this.api.post('/api/auth/mobile-login', {
        id_number: idNumber,
        password: password
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Mobile login with password error:', error);

      if (error.response) {
        return {
          success: false,
          error: error.response.data.error || 'Login failed'
        };
      }

      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
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