// app/(auth)/biometric-setup.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button } from '../../components/ui/Button';
import { apiService } from '../../services/ApiService';
import { StorageService } from '../../services/StorageService';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/Index';
import { User, Employee } from '../../types/User';

export default function BiometricSetupScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);

  // Parse user data from params
  const userData: User = params.userData ? JSON.parse(params.userData as string) : null;
  const employeeData: Employee = params.employeeData ? JSON.parse(params.employeeData as string) : null;
  const token = params.token as string;

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      // Check if biometric hardware is available
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setBiometricSupported(compatible);

      if (compatible) {
        // Check if biometrics are enrolled on device
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricEnrolled(enrolled);

        // Get supported biometric types
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricTypes(types);
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
    }
  };

  const getBiometricTypeName = (): string => {
    if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID / Fingerprint';
    } else if (biometricTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }
    return 'Biometric Authentication';
  };

  const handleSkipSetup = () => {
    Alert.alert(
      'Skip Biometric Setup',
      'You can set up biometric authentication later in your profile settings. Continue to the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            // Go to main app without biometric setup
            router.replace('/(tabs)');
          }
        },
      ]
    );
  };

  const handleBiometricSetup = async () => {
    if (!biometricSupported) {
      Alert.alert(
        'Not Supported',
        'Biometric authentication is not supported on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!biometricEnrolled) {
      Alert.alert(
        'Setup Required',
        `Please set up ${getBiometricTypeName()} in your device settings first, then return to this app.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              // On a real device, you might open device settings
              Alert.alert(
                'Setup Instructions',
                `Go to Settings > Security > ${getBiometricTypeName()} to set up biometric authentication.`
              );
            }
          },
        ]
      );
      return;
    }

    setLoading(true);

    try {
      // Test biometric authentication
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Please verify your biometric to complete setup',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (authResult.success) {
        // Send enrollment data to backend
        const enrollmentData = {
          biometric_data: 'enrolled', // In a real app, this might be more complex
          device_info: {
            device_id: 'mobile_device', // You might want to generate a unique device ID
            device_name: 'Mobile Device',
            os_version: 'Unknown',
            app_version: '1.0.0',
          },
        };

        const response = await apiService.enrollBiometric(enrollmentData);

        if (response.success) {
          // Update local storage
          await StorageService.setBiometricEnrolled(true);
          
          Alert.alert(
            'Success!',
            'Biometric authentication has been set up successfully.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  router.replace('/(tabs)');
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Setup Failed',
            response.error || 'Failed to complete biometric setup. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication was cancelled or failed. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      Alert.alert(
        'Setup Error',
        'An error occurred during biometric setup. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Invalid user data. Please log in again.</Text>
          <Button
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔐</Text>
          </View>
          
          <Text style={styles.title}>Secure Your Account</Text>
          <Text style={styles.subtitle}>
            Set up biometric authentication for quick and secure access
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome, {userData.name}!</Text>
          <Text style={styles.userDetails}>
            ID: {userData.id_number} • {userData.department}
          </Text>
        </View>

        {/* Biometric Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Device Support:</Text>
            <Text style={[
              styles.statusValue,
              { color: biometricSupported ? COLORS.success : COLORS.error }
            ]}>
              {biometricSupported ? 'Supported' : 'Not Supported'}
            </Text>
          </View>
          
          {biometricSupported && (
            <>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Device Setup:</Text>
                <Text style={[
                  styles.statusValue,
                  { color: biometricEnrolled ? COLORS.success : COLORS.warning }
                ]}>
                  {biometricEnrolled ? 'Configured' : 'Not Set Up'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Type:</Text>
                <Text style={styles.statusValue}>
                  {getBiometricTypeName()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Benefits of Biometric Authentication:</Text>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <Text style={styles.benefitText}>Quick access without typing passwords</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🔒</Text>
            <Text style={styles.benefitText}>Enhanced security for your account</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>📱</Text>
            <Text style={styles.benefitText}>Seamless attendance tracking</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={`Set Up ${getBiometricTypeName()}`}
            onPress={handleBiometricSetup}
            loading={loading}
            disabled={loading || !biometricSupported}
            size="large"
            style={styles.primaryButton}
          />
          
          <Button
            title="Skip for Now"
            onPress={handleSkipSetup}
            variant="secondary"
            disabled={loading}
            size="large"
            style={styles.secondaryButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  scrollContent: {
    flexGrow: 1,
    padding: LAYOUT.padding.xl,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.padding.xl,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.xl,
  },
  
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.lg,
    ...LAYOUT.shadow.lg,
  },
  
  iconText: {
    fontSize: 40,
  },
  
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.base,
  },
  
  userInfo: {
    backgroundColor: COLORS.surface,
    padding: LAYOUT.padding.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginBottom: LAYOUT.spacing.xl,
    ...LAYOUT.shadow.base,
  },
  
  welcomeText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.xs,
  },
  
  userDetails: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  
  statusContainer: {
    backgroundColor: COLORS.surface,
    padding: LAYOUT.padding.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    marginBottom: LAYOUT.spacing.xl,
    ...LAYOUT.shadow.base,
  },
  
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: LAYOUT.spacing.xs,
  },
  
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  
  statusValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  
  benefitsContainer: {
    marginBottom: LAYOUT.spacing.xl,
  },
  
  benefitsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: LAYOUT.spacing.lg,
  },
  
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.base,
  },
  
  benefitIcon: {
    fontSize: 20,
    marginRight: LAYOUT.spacing.base,
  },
  
  benefitText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    flex: 1,
  },
  
  buttonContainer: {
    marginTop: 'auto',
  },
  
  primaryButton: {
    marginBottom: LAYOUT.spacing.base,
  },
  
  secondaryButton: {
    marginBottom: LAYOUT.spacing.base,
  },
  
  button: {
    marginTop: LAYOUT.spacing.lg,
  },
  
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.lg,
  },
});