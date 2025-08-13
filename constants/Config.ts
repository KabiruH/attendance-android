// constants/Config.ts - Version with fallback support
export const API_CONFIG = {
  // Update this with your actual server IP/URL
  DEV_BASE_URL: 'http://192.168.100.5:3000', // Replace with your local IP
  PROD_BASE_URL: 'https://attendance-project-nc7k.onrender.com',
  PROD_FALLBACK_URL: 'https://attendance.mukiria.ac.ke',
 
  // Track which URL we're currently using
  _currentBaseUrl: null as string | null,
  _usingFallback: false,
 
  get BASE_URL() {
    if (__DEV__) {
      return this.DEV_BASE_URL;
    } else {
      // Return cached URL if available
      if (this._currentBaseUrl) {
        return this._currentBaseUrl;
      }
      // Default to primary production URL
      this._currentBaseUrl = this.PROD_BASE_URL;
      return this._currentBaseUrl;
    }
  },

  // Method to switch to fallback URL
  switchToFallback() {
    if (!__DEV__) {
      this._currentBaseUrl = this.PROD_FALLBACK_URL;
      this._usingFallback = true;
      console.log('Switched to fallback URL:', this._currentBaseUrl);
    }
  },

  // Method to reset to primary URL
  resetToPrimary() {
    if (!__DEV__) {
      this._currentBaseUrl = this.PROD_BASE_URL;
      this._usingFallback = false;
      console.log('Reset to primary URL:', this._currentBaseUrl);
    }
  },

  // Check if currently using fallback
  get isUsingFallback() {
    return this._usingFallback;
  },

  // Get all production URLs for health checks
  get PROD_URLS() {
    return [this.PROD_BASE_URL, this.PROD_FALLBACK_URL];
  },
 
  ENDPOINTS: {
    // Authentication
    MOBILE_LOGIN: '/api/auth/mobile-login',
    LOGOUT: '/api/auth/logout',
   
    // Attendance - Updated to use unified routes
    WORK_ATTENDANCE: '/api/attendance', // Unified work attendance route
    CLASS_ATTENDANCE: '/api/attendance/class-checkin', // Unified class attendance route
   
    // User & Profile
    USER_PROFILE: '/api/user/profile',
   
    // Biometric
    BIOMETRIC_ENROLL: '/api/biometric/enroll',
    BIOMETRIC_STATUS: '/api/biometric/status',
    BIOMETRIC_VERIFY: '/api/biometric/verify',
   
    // Classes
    ASSIGNED_CLASSES: '/api/classes/assigned',
    ALL_CLASSES: '/api/classes',
    CLASS_BY_ID: (id: number) => `/api/classes/${id}`,
   
    // Reports
    WORK_ATTENDANCE_REPORT: '/api/reports/work-attendance',
    CLASS_ATTENDANCE_REPORT: '/api/reports/class-attendance',
    ATTENDANCE_REPORT: '/api/reports/attendance',
   
    // Notifications
    NOTIFICATIONS: '/api/notifications',
    MARK_NOTIFICATION_READ: (id: number) => `/api/notifications/${id}/read`,
    MARK_ALL_NOTIFICATIONS_READ: '/api/notifications/read-all',
   
    // Settings
    APP_SETTINGS: '/api/settings',
    CHANGE_PASSWORD: '/api/user/change-password',
   
    // Health Check
    HEALTH_CHECK: '/api/health',
  },
 
  TIMEOUT: 10000, // 10 seconds
  FALLBACK_TIMEOUT: 5000, // Shorter timeout for fallback attempts
 
  // Request configuration
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
 
  // Environment helpers
  get IS_DEV() {
    return __DEV__;
  },
 
  get IS_PROD() {
    return !__DEV__;
  },
};