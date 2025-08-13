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
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} />
      
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
              <View style={styles.logoGlow} />
            </View>
            
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your attendance portal
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.form}>
              <View style={styles.inputContainer}>
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
                  style={[styles.input, styles.inputField]}
                />
              </View>

              <View style={styles.inputContainer}>
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
                  style={[styles.input, styles.inputField]}
                />
              </View>

              {/* General Error Message */}
              {errors.general ? (
                <View style={styles.errorContainer}>
                  <View style={styles.errorIcon}>
                    <Text style={styles.errorIconText}>⚠️</Text>
                  </View>
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
                  Forgot your password?{' '}
                  <Text style={styles.forgotPasswordLink}>
                    Contact Administrator
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <View style={styles.helpContainer}>
              <Text style={styles.helpIcon}>💬</Text>
              <Text style={styles.footerText}>
                Need help? Contact IT support
              </Text>
            </View>
            
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
    backgroundColor: COLORS.primary,
  },
  
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: COLORS.primary,
    opacity: 0.9,
  },
  
  keyboardView: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding['2xl'], // Changed from '3xl' to '2xl'
    paddingBottom: LAYOUT.padding.xl,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT.spacing['2xl'],
  },
  
  logoContainer: {
    marginBottom: LAYOUT.spacing.xl,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.shadow.lg, // Changed from 'xl' to 'lg'
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 2,
  },
  
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    opacity: 0.2,
    zIndex: 1,
  },
  
  logoText: {
    fontSize: 48,
  },
  
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'], // Changed from '4xl' to '2xl'
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.background,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.background,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.lg,
    opacity: 0.9,
  },
  
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.borderRadius.xl,
    marginHorizontal: LAYOUT.spacing.sm,
    ...LAYOUT.shadow.lg, // Changed from 'xl' to 'lg'
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  
  form: {
    padding: LAYOUT.padding.xl,
  },
  
  inputContainer: {
    marginBottom: LAYOUT.spacing.lg,
  },
  
  input: {
    marginBottom: 0,
  },
  
  inputField: {
    backgroundColor: COLORS.gray[50],
    borderRadius: LAYOUT.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    paddingHorizontal: LAYOUT.padding.lg,
    paddingVertical: LAYOUT.padding.base,
    // Ensure text color is visible
    color: COLORS.text.primary,
  },
  
  inputText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  
  errorContainer: {
    backgroundColor: COLORS.error + '08',
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.lg,
    marginBottom: LAYOUT.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  errorIcon: {
    marginRight: LAYOUT.spacing.sm,
  },
  
  errorIconText: {
    fontSize: 18,
  },
  
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
    flex: 1,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  
  loginButton: {
    marginTop: LAYOUT.spacing.base,
    borderRadius: LAYOUT.borderRadius.lg,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  
  forgotPasswordContainer: {
    marginTop: LAYOUT.spacing.xl,
    alignItems: 'center',
  },
  
  forgotPasswordText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
  },
  
  forgotPasswordLink: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  
  footer: {
    alignItems: 'center',
    marginTop: LAYOUT.spacing.xl,
  },
  
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: LAYOUT.padding.lg,
    paddingVertical: LAYOUT.padding.sm,
    borderRadius: LAYOUT.borderRadius.full,
  },
  
  helpIcon: {
    fontSize: 16,
    marginRight: LAYOUT.spacing.sm,
  },
  
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.background,
    opacity: 0.9,
  },
  
  debugInfo: {
    marginTop: LAYOUT.spacing.lg,
    padding: LAYOUT.padding.base,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: LAYOUT.borderRadius.base,
  },
  
  debugText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.background,
    textAlign: 'center',
    opacity: 0.8,
  },
});