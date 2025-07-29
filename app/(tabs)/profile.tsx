// app/(tabs)/profile.tsx - Complete Profile Screen
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants';
import { StorageService } from '../../services/StorageService';
import { Employee, User } from '../../types';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await StorageService.getUserData();
      const employeeData = await StorageService.getEmployeeData();
      const biometricStatus = await StorageService.getBiometricEnrolled();
      
      setUser(userData);
      setEmployee(employeeData);
      setBiometricEnrolled(biometricStatus);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAllUserData();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          
          <Text style={styles.userName}>{user?.name || 'Unknown User'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Employee'}</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{user?.id_number || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || employee?.email || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{user?.department || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user?.phone_number || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.securityCard}>
            <View style={styles.securityRow}>
              <View style={styles.securityInfo}>
                <Ionicons 
                  name={biometricEnrolled ? "finger-print" : "finger-print-outline"} 
                  size={24} 
                  color={biometricEnrolled ? COLORS.success : COLORS.gray[400]} 
                />
                <View style={styles.securityText}>
                  <Text style={styles.securityTitle}>Biometric Authentication</Text>
                  <Text style={styles.securityStatus}>
                    {biometricEnrolled ? 'Enabled' : 'Not Set Up'}
                  </Text>
                </View>
              </View>
              
              <Button
                title={biometricEnrolled ? "Manage" : "Set Up"}
                size="small"
                variant="secondary"
                onPress={() => {
                  // Navigate to biometric setup
                  Alert.alert('Coming Soon', 'Biometric management will be available soon.');
                }}
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="error"
            style={styles.logoutButton}
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
    padding: LAYOUT.padding.base,
  },
  
  profileHeader: {
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.xl,
  },
  
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.base,
  },
  
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  
  userName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  
  userRole: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  
  section: {
    marginBottom: LAYOUT.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: LAYOUT.spacing.base,
  },
  
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.lg,
    ...LAYOUT.shadow.base,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: LAYOUT.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
  },
  
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    textAlign: 'right',
    flex: 1,
    marginLeft: LAYOUT.spacing.base,
  },
  
  securityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.lg,
    ...LAYOUT.shadow.base,
  },
  
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  securityText: {
    marginLeft: LAYOUT.spacing.base,
    flex: 1,
  },
  
  securityTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  
  securityStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  
  logoutButton: {
    marginTop: LAYOUT.spacing.lg,
  },
});