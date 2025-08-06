// constants/Config.ts - Fixed version
export const API_CONFIG = {
  // Update this with your actual server IP/URL
  DEV_BASE_URL: 'http://192.168.100.10:3000', // Replace with your local IP
  PROD_BASE_URL: 'https://your-app.vercel.app', // Replace with your production URL
 
  get BASE_URL() {
    return __DEV__ ? this.DEV_BASE_URL : this.PROD_BASE_URL;
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

