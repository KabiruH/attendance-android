// services/ApiService.ts - Updated with correct endpoints
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { StorageService } from './StorageService';
import { API_CONFIG } from '../constants/Index';
import { ApiResponse, LoginRequest, LoginResponse } from '../types/index';

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

  // Specific API methods for mobile app
  async testConnection(): Promise<ApiResponse> {
    return this.get(API_CONFIG.ENDPOINTS.TEST);
  }

  // FIXED: Using your actual endpoint path
  async mobileLogin(idNumber: string): Promise<ApiResponse<LoginResponse>> {
    const loginData: LoginRequest = {
      id_number: idNumber.trim(),
    };
    
    return this.post<LoginResponse>(
      '/api/auth/mobile-login', // Your actual endpoint
      loginData
    );
  }

  async getUserProfile(): Promise<ApiResponse> {
    return this.get('/api/user/profile'); // Your actual endpoint
  }

  async getAttendanceData(): Promise<ApiResponse> {
    return this.get('/api/attendance/mobile'); // Your actual endpoint
  }

  async submitAttendance(attendanceData: any): Promise<ApiResponse> {
    return this.post('/api/attendance/mobile', attendanceData); // Your actual endpoint
  }

  async getAssignedClasses(): Promise<ApiResponse> {
    return this.get('/api/classes/assigned'); // Your actual endpoint
  }

  // FIXED: Using your actual biometric endpoint
  async enrollBiometric(biometricData: any): Promise<ApiResponse> {
    return this.post('/api/biometric/enroll', biometricData); // Your actual endpoint
  }

  async getBiometricStatus(): Promise<ApiResponse> {
    return this.get('/api/biometric/status'); // Your actual endpoint
  }

  private handleError(error: any): ApiResponse {
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.error || 
                          error.response.data?.message || 
                          'Server error occurred';
      
      return {
        success: false,
        error: errorMessage,
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

  // Method to update base URL (useful for switching between dev/prod)
  updateBaseURL(newBaseURL: string): void {
    this.api.defaults.baseURL = newBaseURL;
  }
}

export const apiService = new ApiService();