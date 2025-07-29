// constants/Config.ts
export const API_CONFIG = {
  // Update this with your actual server IP/URL
  DEV_BASE_URL: 'http://192.168.100.10:3000', // Replace with your local IP
  PROD_BASE_URL: 'https://your-app.vercel.app', // Replace with your production URL
  
  get BASE_URL() {
    return __DEV__ ? this.DEV_BASE_URL : this.PROD_BASE_URL;
  },
  
   ENDPOINTS: {
    MOBILE_LOGIN: '/api/auth/mobile-login',
    ATTENDANCE: '/api/attendance/mobile',
    USER_PROFILE: '/api/user/profile',
    BIOMETRIC_ENROLL: '/api/biometric/enroll',      
    BIOMETRIC_STATUS: '/api/biometric/status',     
    CLASSES: '/api/classes/assigned',
  },
  TIMEOUT: 10000, // 10 seconds
};



