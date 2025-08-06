// app/(auth)/login.tsx 
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants';
import { apiService } from '../../services/ApiService';
import { StorageService } from '../../services/StorageService';

export default function LoginScreen() {
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    idNumber: '',
    password: '',
    general: ''
  });

  useEffect(() => {
    checkExistingAuth();
  }, []);

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

  const validateForm = (): boolean => {
    const newErrors = {
      idNumber: '',
      password: '',
      general: ''
    };

    if (!idNumber.trim()) {
      newErrors.idNumber = 'Employee ID is required';
    } else if (idNumber.trim().length < 3) {
      newErrors.idNumber = 'Employee ID must be at least 3 characters';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return !newErrors.idNumber && !newErrors.password;
  };

  const handleLogin = async () => {
    // Clear general error
    setErrors(prev => ({ ...prev, general: '' }));
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call the updated mobile login API with password
      const response = await apiService.mobileLoginWithPassword(idNumber, password);
      
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
        setErrors(prev => ({
          ...prev,
          general: response.error || 'Login failed. Please check your credentials and try again.'
        }));
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Unable to connect to the server. Please try again.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleIdNumberChange = (text: string) => {
    setIdNumber(text.toUpperCase());
    setErrors(prev => ({ ...prev, idNumber: '', general: '' }));
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setErrors(prev => ({ ...prev, password: '', general: '' }));
  };

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
          showsVerticalScrollIndicator={false}
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
              Sign in to mark your attendance
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
              error={errors.idNumber}
              required
              editable={!loading}
              returnKeyType="next"
              style={styles.input}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.password}
              required
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              style={styles.input}
            />

            {/* General Error Message */}
            {errors.general ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            ) : null}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || !idNumber.trim() || !password.trim()}
              size="large"
              style={styles.loginButton}
            />

            {/* Forgot Password Link */}
            <View style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>
                Forgot your password? Contact your administrator
              </Text>
            </View>
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Need help? Contact IT support
            </Text>
            
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>
                  🔧 Debug Mode - Server: {apiService['api']?.defaults?.baseURL || 'Unknown'}
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
    paddingTop: LAYOUT.padding['2xl'],
    paddingBottom: LAYOUT.padding['2xl'],
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
    marginBottom: LAYOUT.spacing['2xl'],
  },
  
  input: {
    marginBottom: LAYOUT.spacing.base,
  },
  
  errorContainer: {
    backgroundColor: COLORS.error + '10',
    borderRadius: LAYOUT.borderRadius.base,
    padding: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
  },
  
  loginButton: {
    marginTop: LAYOUT.spacing.sm,
  },
  
  forgotPasswordContainer: {
    marginTop: LAYOUT.spacing.lg,
    alignItems: 'center',
  },
  
  forgotPasswordText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
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