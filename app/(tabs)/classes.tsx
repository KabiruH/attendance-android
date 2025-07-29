// app/(tabs)/classes.tsx - Enhanced Classes Screen
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

interface ClassItem {
  id: number;
  name: string;
  code: string;
  description?: string;
  department: string;
  duration_hours: number;
  is_active: boolean;
  assigned_at: string;
  attendance_status: {
    checked_in: boolean;
    checked_out: boolean;
    check_in_time?: string;
    check_out_time?: string;
    status: string;
  };
}

export default function ClassesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'inside' | 'outside'>('unknown');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadClasses();
    checkLocationStatus();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadClasses();
      checkLocationStatus();
    }, [])
  );

  const loadClasses = async () => {
    try {
      const response = await apiService.getAssignedClasses();
      if (response.success && response.data) {
        setClasses(response.data.classes || []);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
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

  const handleClassAttendance = async (
    classId: number,
    className: string,
    type: 'class_checkin' | 'class_checkout'
  ) => {
    const actionKey = `${type}_${classId}`;
    setActionLoading(actionKey);

    try {
      // Check location
      const locationResult = await LocationService.getCurrentLocation();
      if (!locationResult.success || !locationResult.withinGeofence) {
        Alert.alert(
          'Location Required',
          `You must be within the school premises to ${type.replace('_', ' ')} for ${className}. Distance: ${Math.round(locationResult.distance || 0)}m`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Verify biometric
      const biometricResult = await BiometricService.authenticateWithBiometrics(
        `Verify your identity to ${type.replace('_', ' ')} for ${className}`
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
        class_id: classId,
      };

      const response = await apiService.submitAttendance(attendanceData);

      if (response.success) {
        Alert.alert(
          'Success!',
          `Successfully ${type.replace('_', ' ')}ed for ${className}`,
          [
            {
              text: 'OK',
              onPress: () => {
                loadClasses(); // Refresh data
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
      console.error('Class attendance error:', error);
      Alert.alert(
        'Error',
        'An error occurred while recording class attendance',
        [{ text: 'OK' }]
      );
    } finally {
      setActionLoading(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
    checkLocationStatus();
  };

  const getFilteredClasses = () => {
    switch (selectedFilter) {
      case 'active':
        return classes.filter(cls => cls.attendance_status.checked_in && !cls.attendance_status.checked_out);
      case 'completed':
        return classes.filter(cls => cls.attendance_status.checked_out);
      default:
        return classes;
    }
  };

  const filteredClasses = getFilteredClasses();
  const stats = {
    total: classes.length,
    active: classes.filter(cls => cls.attendance_status.checked_in && !cls.attendance_status.checked_out).length,
    completed: classes.filter(cls => cls.attendance_status.checked_out).length,
    notStarted: classes.filter(cls => !cls.attendance_status.checked_in).length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContent}>
          <LoadingSpinner message="Loading classes..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Classes</Text>
          <Text style={styles.subtitle}>{filteredClasses.length} classes</Text>
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

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.gray[500] }]}>{stats.notStarted}</Text>
          <Text style={styles.statLabel}>Not Started</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All Classes', count: stats.total },
          { key: 'active', label: 'Active', count: stats.active },
          { key: 'completed', label: 'Completed', count: stats.completed },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              selectedFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === filter.key && styles.filterButtonTextActive
            ]}>
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Classes List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredClasses.length > 0 ? (
          filteredClasses.map((classItem) => (
            <View key={classItem.id} style={styles.classCard}>
              {/* Class Header */}
              <View style={styles.classHeader}>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{classItem.name}</Text>
                  <Text style={styles.classCode}>{classItem.code}</Text>
                  <Text style={styles.classDepartment}>{classItem.department}</Text>
                  {classItem.description && (
                    <Text style={styles.classDescription}>{classItem.description}</Text>
                  )}
                </View>
                
                <View style={styles.classStatus}>
                  <Text style={styles.durationText}>
                    {classItem.duration_hours}h
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { 
                      backgroundColor: classItem.attendance_status.checked_in
                        ? (classItem.attendance_status.checked_out ? COLORS.primary : COLORS.success)
                        : COLORS.gray[300]
                    }
                  ]}>
                    <Text style={styles.statusText}>
                      {classItem.attendance_status.status}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Attendance Info */}
              {(classItem.attendance_status.check_in_time || classItem.attendance_status.check_out_time) && (
                <View style={styles.attendanceInfo}>
                  <View style={styles.timeRow}>
                    {classItem.attendance_status.check_in_time && (
                      <View style={styles.timeItem}>
                        <Ionicons name="log-in" size={16} color={COLORS.success} />
                        <Text style={styles.timeLabel}>In:</Text>
                        <Text style={styles.timeValue}>
                          {new Date(classItem.attendance_status.check_in_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    )}
                    
                    {classItem.attendance_status.check_out_time && (
                      <View style={styles.timeItem}>
                        <Ionicons name="log-out" size={16} color={COLORS.error} />
                        <Text style={styles.timeLabel}>Out:</Text>
                        <Text style={styles.timeValue}>
                          {new Date(classItem.attendance_status.check_out_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Button
                  title="Check In"
                  onPress={() => handleClassAttendance(classItem.id, classItem.name, 'class_checkin')}
                  disabled={
                    !!classItem.attendance_status.check_in_time || 
                    locationStatus !== 'inside' ||
                    actionLoading === `class_checkin_${classItem.id}`
                  }
                  loading={actionLoading === `class_checkin_${classItem.id}`}
                  variant="success"
                  size="small"
                  style={styles.actionButton}
                />
                
                <Button
                  title="Check Out"
                  onPress={() => handleClassAttendance(classItem.id, classItem.name, 'class_checkout')}
                  disabled={
                    !classItem.attendance_status.check_in_time || 
                    !!classItem.attendance_status.check_out_time ||
                    locationStatus !== 'inside' ||
                    actionLoading === `class_checkout_${classItem.id}`
                  }
                  loading={actionLoading === `class_checkout_${classItem.id}`}
                  variant="error"
                  size="small"
                  style={styles.actionButton}
                />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>
              {selectedFilter === 'all' 
                ? 'No classes assigned'
                : `No ${selectedFilter} classes`
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'Contact your administrator to get assigned to classes'
                : `Check the "All Classes" filter to see your complete class list`
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: LAYOUT.padding.base,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },

  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },

  subtitle: {
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
    paddingHorizontal: LAYOUT.padding.base,
    paddingVertical: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
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

  filterContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: LAYOUT.padding.base,
    paddingVertical: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    marginRight: 8,
  },

  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },

  filterButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },

  filterButtonTextActive: {
    color: COLORS.white,
  },

  scrollView: {
    flex: 1,
    padding: LAYOUT.padding.base,
  },

  classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.spacing.base,
  },

  classInfo: {
    flex: 1,
    marginRight: LAYOUT.spacing.base,
  },

  className: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },

  classCode: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  classDepartment: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.light,
    marginTop: 2,
  },

  classDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },

  classStatus: {
    alignItems: 'flex-end',
  },

  durationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.white,
  },

  attendanceInfo: {
    paddingTop: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    marginBottom: LAYOUT.spacing.base,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },

  timeLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },

  timeValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.base,
  },

  actionButton: {
    flex: 1,
  },

  emptyState: {
    alignItems: 'center',
    padding: LAYOUT.padding.xl,
    marginTop: LAYOUT.spacing.xl,
  },

  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    marginTop: LAYOUT.spacing.base,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
});