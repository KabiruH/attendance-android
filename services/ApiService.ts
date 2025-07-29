// services/ApiService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG } from '../constants/Index';
import { ApiResponse, LoginRequest, LoginResponse } from '../types';
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

  // Specific API methods for mobile app
  async testConnection(): Promise<ApiResponse> {
    return this.get(API_CONFIG.ENDPOINTS.TEST);
  }

  async mobileLogin(idNumber: string): Promise<ApiResponse<LoginResponse>> {
    const loginData: LoginRequest = {
      id_number: idNumber.trim(),
    };
    
    return this.post<LoginResponse>(
      API_CONFIG.ENDPOINTS.MOBILE_LOGIN,
      loginData
    );
  }

  async getUserProfile(): Promise<ApiResponse> {
    return this.get(API_CONFIG.ENDPOINTS.USER_PROFILE);
  }

  async getAttendanceData(): Promise<ApiResponse> {
    return this.get(API_CONFIG.ENDPOINTS.ATTENDANCE);
  }

  async submitAttendance(attendanceData: any): Promise<ApiResponse> {
    return this.post(API_CONFIG.ENDPOINTS.ATTENDANCE, attendanceData);
  }

  async getAssignedClasses(): Promise<ApiResponse> {
    return this.get(API_CONFIG.ENDPOINTS.CLASSES);
  }

  async enrollBiometric(biometricData: any): Promise<ApiResponse> {
    return this.post(API_CONFIG.ENDPOINTS.BIOMETRIC_ENROLL, biometricData);
  }

  async getBiometricStatus(): Promise<ApiResponse> {
    return this.get(API_CONFIG.ENDPOINTS.BIOMETRIC_STATUS);
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