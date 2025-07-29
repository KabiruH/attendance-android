// app/(auth)/login.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { apiService } from '../../services/ApiService';
import { StorageService } from '../../services/StorageService';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/Index';


export default function LoginScreen() {
  const [idNumber, setIdNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testingConnection, setTestingConnection] = useState(true);

  useEffect(() => {
    // Test API connection on component mount
    testApiConnection();
    
    // Check if user is already logged in
    checkExistingAuth();
  }, []);

  const testApiConnection = async () => {
    try {
      const response = await apiService.testConnection();
      if (response.success) {
        console.log('✅ API connection successful');
      } else {
        console.log('❌ API connection failed:', response.error);
        Alert.alert(
          'Connection Issue',
          'Unable to connect to the server. Please check your network connection.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('API connection test failed:', error);
      Alert.alert(
        'Connection Error',
        'Cannot reach the server. Please ensure you are connected to the correct network.',
        [{ text: 'OK' }]
      );
    } finally {
      setTestingConnection(false);
    }
  };

  const checkExistingAuth = async () => {
    try {
      const token = await StorageService.getUserToken();
      const userData = await StorageService.getUserData();
      
      if (token && userData) {
        // User is already logged in, redirect to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
    }
  };

  const validateIdNumber = (id: string): string | null => {
    if (!id.trim()) {
      return 'Employee ID is required';
    }
    
    if (id.trim().length < 3) {
      return 'Employee ID must be at least 3 characters';
    }
    
    return null;
  };

  const handleLogin = async () => {
    setError('');
    
    // Validate input
    const validationError = validateIdNumber(idNumber);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Call the mobile login API
      const response = await apiService.mobileLogin(idNumber);
      
      if (response.success && response.data) {
        const { user, employee, token, biometric_enrolled } = response.data;
        
        // Save user data to storage
        await StorageService.saveUserToken(token);
        await StorageService.saveUserData(user);
        
        if (employee) {
          await StorageService.saveEmployeeData(employee);
        }
        
        await StorageService.setBiometricEnrolled(biometric_enrolled);

        console.log('✅ Login successful for:', user.name);

        // Navigate based on biometric enrollment status
        if (biometric_enrolled) {
          // User has biometrics set up, go to main app
          router.replace('/(tabs)');
        } else {
          // User needs to set up biometrics
          router.push({
            pathname: '/(auth)/biometric-setup',
            params: {
              userData: JSON.stringify(user),
              employeeData: JSON.stringify(employee),
              token: token,
            },
          });
        }
      } else {
        // Login failed
        setError(response.error || 'Login failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIdNumberChange = (text: string) => {
    setIdNumber(text.toUpperCase());
    setError('');
  };

  if (testingConnection) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContent}>
          <LoadingSpinner 
            message="Connecting to server..." 
            size="large" 
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>📚</Text>
              </View>
            </View>
            
            <Text style={styles.title}>Employee Attendance</Text>
            <Text style={styles.subtitle}>
              Enter your Employee ID to sign in
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <Input
              label="Employee ID"
              value={idNumber}
              onChangeText={handleIdNumberChange}
              placeholder="Enter your employee ID (e.g., EMP001)"
              autoCapitalize="characters"
              autoCorrect={false}
              error={error}
              required
              editable={!loading}
            />

            <Button
              title="Continue"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || !idNumber.trim()}
              size="large"
              style={styles.loginButton}
            />
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Need help? Contact your administrator
            </Text>
            
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>
                  🔧 Debug Mode - Server: {apiService['api'].defaults.baseURL}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  keyboardView: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: LAYOUT.padding.xl,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT.spacing['3xl'],
  },
  
  logoContainer: {
    marginBottom: LAYOUT.spacing.lg,
  },
  
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.shadow.lg,
  },
  
  logoText: {
    fontSize: 40,
  },
  
  title: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
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
  
  form: {
    marginBottom: LAYOUT.spacing['3xl'],
  },
  
  loginButton: {
    marginTop: LAYOUT.spacing.lg,
  },
  
  footer: {
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  
  debugInfo: {
    marginTop: LAYOUT.spacing.lg,
    padding: LAYOUT.padding.sm,
    backgroundColor: COLORS.gray[100],
    borderRadius: LAYOUT.borderRadius.sm,
  },
  
  debugText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});