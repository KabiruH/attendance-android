// services/BiometricService.ts - CROSS-PLATFORM VERSION
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

export class BiometricService {
  private static isWeb = Platform.OS === 'web';

  static async isBiometricSupported(): Promise<boolean> {
    if (this.isWeb) {
      // On web, we can simulate biometric support for development
      return typeof window !== 'undefined' && 'credentials' in navigator;
    }
    
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  static async isBiometricEnrolled(): Promise<boolean> {
    if (this.isWeb) {
      // On web, simulate enrollment status
      return true; // For development, assume always enrolled
    }
    
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      return false;
    }
  }

  static async getSupportedAuthenticationTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    if (this.isWeb) {
      // Return a simulated type for web
      return [LocalAuthentication.AuthenticationType.FINGERPRINT];
    }
    
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported auth types:', error);
      return [];
    }
  }

  static async authenticateWithBiometrics(
    promptMessage: string = 'Please verify your identity'
  ): Promise<BiometricResult> {
    try {
      if (this.isWeb) {
        // On web, show a confirmation dialog to simulate biometric auth
        return new Promise((resolve) => {
          if (typeof window !== 'undefined') {
            const confirmed = window.confirm(
              `🔐 Simulated Biometric Authentication\n\n${promptMessage}\n\nClick OK to simulate successful authentication.`
            );
            resolve({
              success: confirmed,
              error: confirmed ? undefined : 'User cancelled authentication',
              biometricType: 'Simulated Fingerprint'
            });
          } else {
            resolve({
              success: false,
              error: 'Web environment not available'
            });
          }
        });
      }

      // Check if biometric is supported
      const isSupported = await this.isBiometricSupported();
      if (!isSupported) {
        return {
          success: false,
          error: 'Biometric authentication is not supported on this device',
        };
      }

      // Check if biometric is enrolled
      const isEnrolled = await this.isBiometricEnrolled();
      if (!isEnrolled) {
        return {
          success: false,
          error: 'No biometric credentials are enrolled on this device',
        };
      }

      // Perform authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const authTypes = await this.getSupportedAuthenticationTypes();
        const biometricType = this.getBiometricTypeName(authTypes);
        
        return {
          success: true,
          biometricType,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication error occurred',
      };
    }
  }

  private static getBiometricTypeName(
    authTypes: LocalAuthentication.AuthenticationType[]
  ): string {
    if (this.isWeb) {
      return 'Simulated Biometric';
    }
    
    if (authTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (authTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    } else if (authTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  }

  static async promptForBiometricSetup(): Promise<void> {
    if (this.isWeb) {
      if (typeof window !== 'undefined') {
        window.alert(
          '🔐 Biometric Setup\n\nOn a real mobile device, this would open your device settings to set up biometric authentication.\n\nFor web development, biometric authentication is simulated.'
        );
      }
      return;
    }
    
    Alert.alert(
      'Biometric Setup Required',
      'This app requires biometric authentication for security. Please set up Touch ID, Face ID, or Fingerprint in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Alert.alert(
              'Setup Instructions',
              'Please go to your device Settings > Security > Biometrics to set up your biometric authentication.'
            );
          },
        },
      ]
    );
  }

  // Development helper
  static getPlatformInfo(): string {
    return `Platform: ${Platform.OS}, Biometric: ${this.isWeb ? 'Simulated' : 'Native'}`;
  }
}