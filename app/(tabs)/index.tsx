// app/(tabs)/index.tsx - Main Dashboard Screen
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants';
import { apiService } from '../../services/ApiService';
import { BiometricService } from '../../services/BiometricService';
import { LocationService } from '../../services/LocationService';
import { StorageService } from '../../services/StorageService';
import { AttendanceResponse, Employee, User } from '../../types';

interface DashboardStats {
  todayHours: string;
  weeklyHours: string;
  monthlyDays: number;
  onTimePercentage: number;
}

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'inside' | 'outside'>('unknown');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    loadAttendanceData();
    checkLocationStatus();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAttendanceData();
      checkLocationStatus();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userData = await StorageService.getUserData();
      const employeeData = await StorageService.getEmployeeData();
      setUser(userData);
      setEmployee(employeeData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAttendanceData = async () => {
    try {
      const response = await apiService.getAttendanceData();
      if (response.success && response.data) {
        setAttendanceData(response.data);
        calculateStats(response.data);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkLocationStatus = async () => {
    try {
      const locationResult = await LocationService.getCurrentLocation();
      if (locationResult.success) {
        setLocationStatus(locationResult.withinGeofence ? 'inside' : 'outside');
      }
    } catch (error) {
      console.error('Error checking location:', error);
    }
  };

  const calculateStats = (data: AttendanceResponse) => {
    // Calculate today's hours
    let todayHours = '0h 0m';
    if (data.today.work_attendance?.check_in_time) {
      const checkIn = new Date(data.today.work_attendance.check_in_time);
      const checkOut = data.today.work_attendance.check_out_time 
        ? new Date(data.today.work_attendance.check_out_time)
        : new Date();
      
      const diffMs = checkOut.getTime() - checkIn.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      todayHours = `${hours}h ${minutes}m`;
    }

    // Calculate weekly hours (last 7 days)
    const weeklyMs = data.history
      .filter(record => record.check_in_time && record.check_out_time)
      .reduce((total, record) => {
        const checkIn = new Date(record.check_in_time!);
        const checkOut = new Date(record.check_out_time!);
        return total + (checkOut.getTime() - checkIn.getTime());
      }, 0);
    
    const weeklyHours = Math.floor(weeklyMs / (1000 * 60 * 60));
    const weeklyMinutes = Math.floor((weeklyMs % (1000 * 60 * 60)) / (1000 * 60));

    // Calculate monthly stats
    const monthlyDays = data.history.filter(record => 
      record.status === 'Present' || record.status === 'Late'
    ).length;

    const onTimeCount = data.history.filter(record => record.status === 'Present').length;
    const onTimePercentage = data.history.length > 0 ? Math.round((onTimeCount / data.history.length) * 100) : 100;

    setStats({
      todayHours,
      weeklyHours: `${weeklyHours}h ${weeklyMinutes}m`,
      monthlyDays,
      onTimePercentage,
    });
  };

  const handleWorkCheckIn = async () => {
    await handleAttendanceAction('work_checkin', 'Checking in to work...');
  };

  const handleWorkCheckOut = async () => {
    await handleAttendanceAction('work_checkout', 'Checking out from work...');
  };

  const handleClassCheckIn = async (classId?: number) => {
    if (!classId) {
      Alert.alert('Select Class', 'Please select a class to check in to.');
      return;
    }
    await handleAttendanceAction('class_checkin', 'Checking in to class...', classId);
  };

  const handleClassCheckOut = async (classId?: number) => {
    if (!classId) {
      Alert.alert('Select Class', 'Please select a class to check out from.');
      return;
    }
    await handleAttendanceAction('class_checkout', 'Checking out from class...', classId);
  };

  const handleAttendanceAction = async (
    type: 'work_checkin' | 'work_checkout' | 'class_checkin' | 'class_checkout',
    loadingMessage: string,
    classId?: number
  ) => {
    setActionLoading(type);

    try {
      // Check location
      const locationResult = await LocationService.getCurrentLocation();
      if (!locationResult.success || !locationResult.withinGeofence) {
        Alert.alert(
          'Location Required',
          `You must be within the school premises to ${type.replace('_', ' ')}. Distance: ${locationResult.distance}m`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Verify biometric
      const biometricResult = await BiometricService.authenticateWithBiometrics(
        `Please verify your identity to ${type.replace('_', ' ')}`
      );

      if (!biometricResult.success) {
        Alert.alert(
          'Authentication Failed',
          biometricResult.error || 'Biometric authentication is required',
          [{ text: 'OK' }]
        );
        return;
      }

      // Submit attendance
      const attendanceData = {
        type,
        location: locationResult.location!,
        biometric_verified: true,
        ...(classId && { class_id: classId }),
      };

      const response = await apiService.submitAttendance(attendanceData);

      if (response.success) {
        Alert.alert(
          'Success!',
          `Successfully ${type.replace('_', ' ')}ed`,
          [
            {
              text: 'OK',
              onPress: () => {
                loadAttendanceData(); // Refresh data
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          response.error || 'Failed to record attendance',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Attendance action error:', error);
      Alert.alert(
        'Error',
        'An error occurred while recording attendance',
        [{ text: 'OK' }]
      );
    } finally {
      setActionLoading(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceData();
    checkLocationStatus();
  };

  if (loading && !attendanceData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContent}>
          <LoadingSpinner message="Loading dashboard..." />
        </View>
      </SafeAreaView>
    );
  }

  const isCheckedIn = attendanceData?.today.is_checked_in || false;
  const todayAttendance = attendanceData?.today.work_attendance;
  const todayClasses = attendanceData?.today.class_attendance || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>
              Welcome back, {user?.name?.split(' ')[0] || 'Employee'}
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          
          {/* Location Status */}
          <View style={[
            styles.locationBadge,
            { backgroundColor: locationStatus === 'inside' ? COLORS.success : COLORS.error }
          ]}>
            <Ionicons 
              name={locationStatus === 'inside' ? 'location' : 'location-outline'} 
              size={16} 
              color={COLORS.white} 
            />
            <Text style={styles.locationText}>
              {locationStatus === 'inside' ? 'On Campus' : 'Off Campus'}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.todayHours}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.weeklyHours}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.monthlyDays}</Text>
              <Text style={styles.statLabel}>Days This Month</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {stats.onTimePercentage}%
              </Text>
              <Text style={styles.statLabel}>On Time</Text>
            </View>
          </View>
        )}

        {/* Work Attendance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Attendance</Text>
          
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceStatus}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: isCheckedIn ? COLORS.success : COLORS.gray[300] }
                ]} />
                <Text style={styles.statusText}>
                  {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                </Text>
              </View>
              
              {todayAttendance?.check_in_time && (
                <Text style={styles.timeText}>
                  {new Date(todayAttendance.check_in_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Button
                title="Check In"
                onPress={handleWorkCheckIn}
                disabled={isCheckedIn || locationStatus !== 'inside' || actionLoading === 'work_checkin'}
                loading={actionLoading === 'work_checkin'}
                variant="success"
                style={styles.actionButton}
              />
              
              <Button
                title="Check Out"
                onPress={handleWorkCheckOut}
                disabled={!isCheckedIn || locationStatus !== 'inside' || actionLoading === 'work_checkout'}
                loading={actionLoading === 'work_checkout'}
                variant="error"
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>

        {/* Class Attendance Section */}
       <View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Today's Classes</Text>
    <TouchableOpacity 
      style={styles.viewAllButton}
      onPress={() => {
        // Navigate to classes tab - you can implement this based on your navigation
        console.log('Navigate to classes tab');
      }}
    >
      <Text style={styles.viewAllText}>View All</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
    </TouchableOpacity>
  </View>
  
  {todayClasses.length > 0 ? (
    <>
      {/* Classes Summary Stats */}
      <View style={styles.classesSummary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {todayClasses.filter(c => c.check_in_time && !c.check_out_time).length}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {todayClasses.filter(c => c.check_out_time).length}
          </Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {todayClasses.filter(c => !c.check_in_time).length}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </View>

      {/* Class Cards */}
      {todayClasses.slice(0, 3).map((classAttendance, index) => (
        <View key={index} style={styles.classCard}>
          <View style={styles.classCardHeader}>
            <View style={styles.classCardInfo}>
              <Text style={styles.className}>{classAttendance.class.name}</Text>
              <Text style={styles.classCode}>{classAttendance.class.code}</Text>
              <Text style={styles.classDuration}>
                Duration: {classAttendance.class.duration_hours}h
              </Text>
            </View>
            
            <View style={styles.classCardStatus}>
              <View style={[
                styles.classStatusBadge,
                { 
                  backgroundColor: classAttendance.check_in_time
                    ? (classAttendance.check_out_time ? COLORS.primary : COLORS.success)
                    : COLORS.gray[300]
                }
              ]}>
                <Text style={styles.classStatusText}>
                  {classAttendance.check_out_time 
                    ? 'Completed' 
                    : classAttendance.check_in_time 
                    ? 'Active' 
                    : 'Pending'
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Class Times */}
          {(classAttendance.check_in_time || classAttendance.check_out_time) && (
            <View style={styles.classTimesRow}>
              {classAttendance.check_in_time && (
                <View style={styles.classTimeItem}>
                  <Ionicons name="log-in" size={14} color={COLORS.success} />
                  <Text style={styles.classTimeLabel}>In:</Text>
                  <Text style={styles.classTimeValue}>
                    {new Date(classAttendance.check_in_time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              
              {classAttendance.check_out_time && (
                <View style={styles.classTimeItem}>
                  <Ionicons name="log-out" size={14} color={COLORS.error} />
                  <Text style={styles.classTimeLabel}>Out:</Text>
                  <Text style={styles.classTimeValue}>
                    {new Date(classAttendance.check_out_time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Class Action Buttons */}
          <View style={styles.classButtonRow}>
            <Button
              title="Check In"
              onPress={() => handleClassCheckIn(classAttendance.class_id)}
              disabled={
                !isCheckedIn || 
                !!classAttendance.check_in_time || 
                locationStatus !== 'inside' ||
                actionLoading === 'class_checkin'
              }
              loading={actionLoading === 'class_checkin'}
              variant="success"
              size="small"
              style={styles.classActionButton}
            />
            
            <Button
              title="Check Out"
              onPress={() => handleClassCheckOut(classAttendance.class_id)}
              disabled={
                !classAttendance.check_in_time || 
                !!classAttendance.check_out_time ||
                locationStatus !== 'inside' ||
                actionLoading === 'class_checkout'
              }
              loading={actionLoading === 'class_checkout'}
              variant="secondary"
              size="small"
              style={styles.classActionButton}
            />
          </View>
        </View>
      ))}

      {/* Show More Classes Indicator */}
      {todayClasses.length > 3 && (
        <TouchableOpacity style={styles.showMoreClasses}>
          <Text style={styles.showMoreText}>
            +{todayClasses.length - 3} more classes
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </>
  ) : (
    <View style={styles.emptyClasses}>
      <Ionicons name="school-outline" size={48} color={COLORS.gray[400]} />
      <Text style={styles.emptyText}>No classes scheduled for today</Text>
    </View>
  )}
</View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="calendar" size={24} color={COLORS.primary} />
              <Text style={styles.quickActionText}>View Schedule</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="analytics" size={24} color={COLORS.primary} />
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="settings" size={24} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
 sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.base,
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  viewAllText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  classesSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.base,
    padding: LAYOUT.padding.sm,
    marginBottom: LAYOUT.spacing.base,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },

  summaryLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.spacing.sm,
  },

  classCardInfo: {
    flex: 1,
  },

  classCardStatus: {
    alignItems: 'flex-end',
  },

  classDuration: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.light,
    marginTop: 2,
  },

  classStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  classStatusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.white,
  },

  classTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.spacing.sm,
    paddingTop: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },

  classTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },

  classTimeLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },

  classTimeValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },

  classButtonRow: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.sm,
    marginTop: LAYOUT.spacing.sm,
  },

  classActionButton: {
    flex: 1,
  },

  showMoreClasses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.padding.sm,
    marginTop: LAYOUT.spacing.sm,
    backgroundColor: COLORS.gray[100],
    borderRadius: LAYOUT.borderRadius.base,
  },

  showMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginRight: 4,
  },

  emptyClasses: {
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.base,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  scrollContent: {
    padding: LAYOUT.padding.base,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.spacing.xl,
  },
  
  welcomeText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  
  dateText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  locationText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: 4,
  },
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.lg,
    marginBottom: LAYOUT.spacing.xl,
    ...LAYOUT.shadow.base,
  },
  
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
    textAlign: 'center',
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
  
  attendanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.lg,
    ...LAYOUT.shadow.base,
  },
  
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.lg,
  },
  
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  
  timeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  
  buttonRow: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.base,
  },
  
  actionButton: {
    flex: 1,
  },
  
  classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.base,
    padding: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
    ...LAYOUT.shadow.sm,
  },
  
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.spacing.base,
  },
  
  className: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  
  classCode: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  
  classTimes: {
    alignItems: 'flex-end',
  },
  
  classTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  
  classButton: {
    flex: 1,
  },
  
  emptyState: {
    alignItems: 'center',
    padding: LAYOUT.padding.xl,
  },
  
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginTop: LAYOUT.spacing.base,
  },
  
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  quickAction: {
    alignItems: 'center',
    padding: LAYOUT.padding.base,
  },
  
  quickActionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: LAYOUT.spacing.xs,
  },
});
