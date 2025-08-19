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
    console.log('📱 Loading all attendance data...');
    
    // Fetch both work and class attendance
    const response = await apiService.getAllAttendanceData();
    
    console.log('🔍 Combined attendance response:', JSON.stringify(response, null, 2));
    
    if (response.success && response.data) {
      // Process work attendance
      const workData = response.data.work;
      const classData = response.data.class;
      
      console.log('📊 Data structure:', {
        hasWorkData: !!workData,
        isCheckedIn: workData?.today?.is_checked_in,
        hasClassData: !!classData,
        todayClasses: classData?.today?.class_attendance?.length || 0,
        activeClassSession: classData?.today?.active_class_session
      });
      
      // Create the attendance data structure your dashboard expects
      const attendanceData = {
        today: {
          work_attendance: workData?.today?.work_attendance || null,
          is_checked_in: workData?.today?.is_checked_in || false,
          class_attendance: classData?.today?.class_attendance || [],
          active_class_session: classData?.today?.active_class_session || null
        },
        history: workData?.history || [],
        classHistory: classData?.history || [],
        current_date: workData?.current_date || new Date().toISOString().split('T')[0]
      };
      
      console.log('📋 Final attendance data:', {
        isCheckedIn: attendanceData.today.is_checked_in,
        hasWorkAttendance: !!attendanceData.today.work_attendance,
        classAttendanceCount: attendanceData.today.class_attendance.length,
        hasActiveClass: !!attendanceData.today.active_class_session
      });
      
      setAttendanceData(attendanceData);
      calculateStats(attendanceData);
    } else {
      console.log('❌ Failed to load attendance data:', response.error);
      // Set default empty state
      setAttendanceData({
        today: {
          work_attendance: null,
          is_checked_in: false,
          class_attendance: [],
          active_class_session: null
        },
        history: [],
        classHistory: [],
        current_date: new Date().toISOString().split('T')[0]
      });
      setStats(null);
    }
  } catch (error) {
    console.error('💥 Error loading attendance data:', error);
    setAttendanceData({
      today: {
        work_attendance: null,
        is_checked_in: false,
        class_attendance: [],
        active_class_session: null
      },
      history: [],
      classHistory: [],
      current_date: new Date().toISOString().split('T')[0]
    });
    setStats(null);
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
  console.log('📈 Calculating stats with data:', {
    hasTodayWorkAttendance: !!data?.today?.work_attendance,
    checkInTime: data?.today?.work_attendance?.check_in_time,
    checkOutTime: data?.today?.work_attendance?.check_out_time,
    historyLength: data?.history?.length || 0
  });

  // Helper function to check if a date is a weekend (Saturday or Sunday)
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Calculate today's hours
  let todayHours = '0h 0m';
  if (data?.today?.work_attendance?.check_in_time) {
    const checkIn = new Date(data.today.work_attendance.check_in_time);
    const checkOut = data.today.work_attendance.check_out_time 
      ? new Date(data.today.work_attendance.check_out_time)
      : new Date();
    
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    todayHours = `${hours}h ${minutes}m`;
  }

  // Get current date and set up date ranges
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate weekly hours (current week starting from Monday)
  const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)); // Adjust to previous Monday
  monday.setHours(0, 0, 0, 0); // Start of Monday

  // Calculate monthly stats (current month starting from 1st, excluding weekends)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  let weeklyMs = 0;
  let monthlyDays = 0;
  let onTimeCount = 0;
  let totalDays = 0;

  (data?.history || []).forEach(record => {
    if (!record.check_in_time || !record.check_out_time) return;

    const recordDate = new Date(record.check_in_time);
    const dateKey = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Skip weekends
    if (isWeekend(recordDate)) return;

    // Calculate weekly hours (records from Monday of this week)
    if (recordDate >= monday) {
      const checkIn = new Date(record.check_in_time);
      const checkOut = new Date(record.check_out_time);
      weeklyMs += checkOut.getTime() - checkIn.getTime();
    }

    // Calculate monthly stats (records from 1st of this month)
    if (recordDate >= firstDayOfMonth && recordDate.getMonth() === currentMonth) {
      if (record.status === 'Present' || record.status === 'Late') {
        monthlyDays++;
      }
      
      if (record.status === 'Present') {
        onTimeCount++;
      }
      
      totalDays++;
    }
  });

  const weeklyHours = Math.floor(weeklyMs / (1000 * 60 * 60));
  const weeklyMinutes = Math.floor((weeklyMs % (1000 * 60 * 60)) / (1000 * 60));
  const onTimePercentage = totalDays > 0 ? Math.round((onTimeCount / totalDays) * 100) : 0;

  const calculatedStats = {
    todayHours,
    weeklyHours: `${weeklyHours}h ${weeklyMinutes}m`,
    monthlyDays,
    onTimePercentage,
  };
  
  console.log('📊 Final calculated stats:', calculatedStats);
  setStats(calculatedStats);
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
  
  // Check if already in a class
  const currentAttendance = attendanceData; // Use the state variable
  if (currentAttendance?.today?.active_class_session) {
    Alert.alert(
      'Active Class Session',
      `You are already checked into a class. Please check out first.`,
      [{ text: 'OK' }]
    );
    return;
  }
  
  await handleClassAttendanceAction('class_checkin', classId);
};



const handleClassCheckOut = async (classId?: number) => {
  let targetClassId = classId;
  
  if (!targetClassId) {
    // If no class ID provided, try to use the active session
    const currentAttendance = attendanceData; // Use the state variable
    const activeSession = currentAttendance?.today?.active_class_session;
    if (activeSession?.class_id) {
      targetClassId = activeSession.class_id;
    } else {
      Alert.alert('Select Class', 'Please select a class to check out from.');
      return;
    }
  }
  
  await handleClassAttendanceAction('class_checkout', targetClassId);
};

const handleClassAttendanceAction = async (
  type: 'class_checkin' | 'class_checkout',
  classId: number
) => {
  setActionLoading(type);

  try {
    // Check if checked into work first
    const currentAttendance = attendanceData; // Use the state variable
    if (!currentAttendance?.today?.is_checked_in) {
      Alert.alert(
        'Check In Required',
        'You must check into work before checking into classes.',
        [{ text: 'OK' }]
      );
      setActionLoading(null);
      return;
    }

    // Check location
    const locationResult = await LocationService.getCurrentLocation();
    if (!locationResult.success || !locationResult.withinGeofence) {
      Alert.alert(
        'Location Required',
        `You must be within the school premises. Distance: ${locationResult.distance}m`,
        [{ text: 'OK' }]
      );
      setActionLoading(null);
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
      setActionLoading(null);
      return;
    }

    // Submit class attendance - renamed variable to avoid conflict
    const classAttendanceRequest = {
      type,
      class_id: classId,
      location: locationResult.location!,
      biometric_verified: true,
    };

    console.log('📤 Submitting class attendance:', classAttendanceRequest);
    const response = await apiService.submitClassAttendance(classAttendanceRequest);
    console.log('📥 Class submission response:', response);

    if (response.success) {
      const className = response.data?.class_name || 'class';
      const action = type === 'class_checkin' ? 'checked into' : 'checked out from';
      
      Alert.alert(
        'Success!',
        `Successfully ${action} ${className}`,
        [
          {
            text: 'OK',
            onPress: async () => {
              // Refresh all data
              setTimeout(() => {
                console.log('🔄 Refreshing after class action...');
                loadAttendanceData();
              }, 1000);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Error',
        response.error || 'Failed to record class attendance',
        [{ text: 'OK' }]
      );
    }
  } catch (error: any) {
    console.error('Class attendance action error:', error);
    Alert.alert(
      'Error',
      error.message || 'An error occurred while recording class attendance',
      [{ text: 'OK' }]
    );
  } finally {
    setActionLoading(null);
  }
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

  const isCheckedIn = attendanceData?.today?.is_checked_in || false;
  const todayAttendance = attendanceData?.today?.work_attendance;
  const todayClasses = attendanceData?.today?.class_attendance || [];

const renderClassAttendance = () => {
  const todayClasses = attendanceData?.today?.class_attendance || [];
  const activeClassSession = attendanceData?.today?.active_class_session;
  
  // Check if user is checked into work
  const canCheckIntoClass = attendanceData?.today?.is_checked_in && !activeClassSession;
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Classes</Text>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => {
            // Navigate to classes tab
            console.log('Navigate to classes tab');
          }}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Active Class Session Indicator */}
      {activeClassSession && (
        <View style={styles.activeClassBanner}>
          <View style={styles.activeClassInfo}>
            <View style={styles.activeDot} />
            <Text style={styles.activeClassText}>
              Active: {activeClassSession.class_name || 'Class Session'}
            </Text>
            <Text style={styles.activeClassTime}>
              Since {new Date(activeClassSession.check_in_time).toLocaleTimeString('en-KE', {
                timeZone: 'Africa/Nairobi',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Button
            title="Check Out"
            onPress={() => handleClassCheckOut(activeClassSession.class_id)}
            loading={actionLoading === 'class_checkout'}
            variant="secondary"
            size="small"
            style={styles.checkOutButton}
          />
        </View>
      )}
      
      {/* Classes Summary Stats */}
      {todayClasses.length > 0 && (
        <View style={styles.classesSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {todayClasses.filter((c: any) => c.check_in_time && !c.check_out_time).length}
            </Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {todayClasses.filter((c: any) => c.check_out_time).length}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {todayClasses.length}
            </Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}
      
      {/* Class Cards */}
      {todayClasses.length > 0 ? (
        todayClasses.slice(0, 3).map((classAttendance: any, index: number) => (
          <View key={classAttendance.id || index} style={styles.classCard}>
            <View style={styles.classCardHeader}>
              <View style={styles.classCardInfo}>
                <Text style={styles.className}>
                  {classAttendance.class?.name || 'Unknown Class'}
                </Text>
                <Text style={styles.classCode}>
                  {classAttendance.class?.code || ''}
                </Text>
                {classAttendance.class?.duration_hours && (
                  <Text style={styles.classDuration}>
                    Duration: {classAttendance.class.duration_hours}h
                  </Text>
                )}
              </View>
              
              <View style={styles.classCardStatus}>
                <View style={[
                  styles.classStatusBadge,
                  { 
                    backgroundColor: classAttendance.check_out_time 
                      ? COLORS.primary 
                      : classAttendance.check_in_time 
                      ? COLORS.success 
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
                      {new Date(classAttendance.check_in_time).toLocaleTimeString('en-KE', {
                        timeZone: 'Africa/Nairobi',
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
                      {new Date(classAttendance.check_out_time).toLocaleTimeString('en-KE', {
                        timeZone: 'Africa/Nairobi',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyClasses}>
          <Ionicons name="school-outline" size={48} color={COLORS.gray[400]} />
          <Text style={styles.emptyText}>
            {!attendanceData?.today?.is_checked_in 
              ? 'Check into work to start class attendance'
              : 'No class attendance recorded today'}
          </Text>
        </View>
      )}
      
      {/* Show More Classes Indicator */}
      {todayClasses.length > 3 && (
        <TouchableOpacity style={styles.showMoreClasses}>
          <Text style={styles.showMoreText}>
            +{todayClasses.length - 3} more classes
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};
  
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
              {new Date().toLocaleDateString('en-KE', {
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
                  {new Date(todayAttendance.check_in_time).toLocaleTimeString('en-KE', {
                    timeZone: 'Africa/Nairobi',
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
                    {new Date(classAttendance.check_in_time).toLocaleTimeString('en-KE', {
                      timeZone: 'Africa/Nairobi',
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
                    {new Date(classAttendance.check_out_time).toLocaleTimeString('en-KE', {
                      timeZone: 'Africa/Nairobi',
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

   classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.base,
    padding: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
    ...LAYOUT.shadow.sm,
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

  classActionButton: {
    flex: 1,
  },

  emptyClasses: {
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.base,
  },

  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginTop: LAYOUT.spacing.base,
    textAlign: 'center',
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

   activeClassBanner: {
    backgroundColor: COLORS.success + '15',
    borderRadius: LAYOUT.borderRadius.base,
    padding: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },

    activeClassInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    // Add pulsing animation if you want
  },

   activeClassText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    flex: 1,
  },

  activeClassTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },

  checkOutButton: {
    marginLeft: LAYOUT.spacing.sm,
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
 
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.spacing.base,
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
