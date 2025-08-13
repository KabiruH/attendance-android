// app/(tabs)/classes.tsx - Enhanced Classes Screen with Live Updates
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
  Animated,
  Dimensions,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants';
import { apiService } from '../../services/ApiService';
import { BiometricService } from '../../services/BiometricService';
import { LocationService } from '../../services/LocationService';

const { width } = Dimensions.get('window');

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
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadClasses();
    checkLocationStatus();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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

  // Function to update specific class attendance status locally
  const updateClassAttendanceStatus = (classId: number, attendanceData: any) => {
    setClasses(prevClasses => 
      prevClasses.map(classItem => {
        if (classItem.id === classId) {
          return {
            ...classItem,
            attendance_status: {
              ...classItem.attendance_status,
              ...attendanceData
            }
          };
        }
        return classItem;
      })
    );
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
        // IMMEDIATE UPDATE: Update the UI immediately before showing alert
        const currentTime = new Date().toISOString();
        
        if (type === 'class_checkin') {
          updateClassAttendanceStatus(classId, {
            checked_in: true,
            check_in_time: currentTime,
            status: 'In Progress'
          });
        } else {
          updateClassAttendanceStatus(classId, {
            checked_out: true,
            check_out_time: currentTime,
            status: 'Completed'
          });
        }

        // Show success alert
        Alert.alert(
          'Success!',
          `Successfully ${type.replace('_', ' ')}ed for ${className}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh data to get server confirmation
                loadClasses();
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

  const getStatusColor = (classItem: ClassItem) => {
    if (classItem.attendance_status.checked_out) return COLORS.primary;
    if (classItem.attendance_status.checked_in) return COLORS.success;
    return COLORS.gray[400];
  };

  const getStatusIcon = (classItem: ClassItem) => {
    if (classItem.attendance_status.checked_out) return 'checkmark-circle';
    if (classItem.attendance_status.checked_in) return 'time';
    return 'ellipse-outline';
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (checkIn: string, checkOut?: string) => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
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
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>My Classes</Text>
              <Text style={styles.subtitle}>
                {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'}
                {selectedFilter !== 'all' && ` • ${selectedFilter}`}
              </Text>
            </View>
            
            {/* Enhanced Location Status with live update indicator */}
            <TouchableOpacity
              style={[
                styles.locationBadge,
                { 
                  backgroundColor: locationStatus === 'inside' 
                    ? COLORS.success 
                    : locationStatus === 'outside' 
                      ? COLORS.error 
                      : COLORS.gray[400] 
                }
              ]}
              onPress={checkLocationStatus}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={locationStatus === 'inside' ? 'location' : 'location-outline'} 
                size={14} 
                color={COLORS.white} 
              />
              <Text style={styles.locationText}>
                {locationStatus === 'inside' ? 'On Campus' : 
                 locationStatus === 'outside' ? 'Off Campus' : 'Checking...'}
              </Text>
              <Ionicons name="refresh" size={12} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Enhanced Stats Cards with animated updates */}
          <View style={styles.statsContainer}>
            {[
              { key: 'active', value: stats.active, label: 'Active', color: COLORS.success, icon: 'play-circle' },
              { key: 'completed', value: stats.completed, label: 'Completed', color: COLORS.primary, icon: 'checkmark-circle' },
              { key: 'notStarted', value: stats.notStarted, label: 'Pending', color: COLORS.gray[500], icon: 'time-outline' },
              { key: 'total', value: stats.total, label: 'Total', color: COLORS.text.primary, icon: 'library-outline' },
            ].map((stat, index) => (
              <Animated.View key={stat.key} style={[styles.statCard, index === 0 && styles.statCardFirst]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Enhanced Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {[
              { key: 'all', label: 'All Classes', count: stats.total, icon: 'library-outline' },
              { key: 'active', label: 'Active', count: stats.active, icon: 'play-circle' },
              { key: 'completed', label: 'Completed', count: stats.completed, icon: 'checkmark-circle' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  selectedFilter === filter.key && styles.filterTabActive
                ]}
                onPress={() => setSelectedFilter(filter.key as any)}
                activeOpacity={0.7}
              >
                <View style={styles.filterTabContent}>
                  <Ionicons 
                    name={filter.icon as any} 
                    size={16} 
                    color={selectedFilter === filter.key ? COLORS.white : COLORS.text.secondary} 
                  />
                  <Text style={[
                    styles.filterTabText,
                    selectedFilter === filter.key && styles.filterTabTextActive
                  ]}>
                    {filter.label}
                  </Text>
                  <View style={[
                    styles.filterBadge,
                    selectedFilter === filter.key && styles.filterBadgeActive
                  ]}>
                    <Text style={[
                      styles.filterBadgeText,
                      selectedFilter === filter.key && styles.filterBadgeTextActive
                    ]}>
                      {filter.count}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Enhanced Classes List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredClasses.length > 0 ? (
            filteredClasses.map((classItem, index) => (
              <Animated.View 
                key={classItem.id} 
                style={[
                  styles.classCard, 
                  { marginTop: index === 0 ? 0 : LAYOUT.spacing.base },
                  // Add visual feedback for active classes
                  classItem.attendance_status.checked_in && !classItem.attendance_status.checked_out && styles.activeClassCard
                ]}
              >
                {/* Enhanced Class Header */}
                <View style={styles.classHeader}>
                  <View style={styles.classMainInfo}>
                    <View style={styles.classStatusIndicator}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(classItem) }]} />
                      <Ionicons 
                        name={getStatusIcon(classItem)} 
                        size={20} 
                        color={getStatusColor(classItem)} 
                      />
                    </View>
                    
                    <View style={styles.classDetails}>
                      <Text style={styles.className}>{classItem.name}</Text>
                      <View style={styles.classMetaRow}>
                        <Text style={styles.classCode}>{classItem.code}</Text>
                        <View style={styles.separator} />
                        <Text style={styles.classDepartment}>{classItem.department}</Text>
                        <View style={styles.separator} />
                        <Text style={styles.durationText}>{classItem.duration_hours}h</Text>
                      </View>
                      {classItem.description && (
                        <Text style={styles.classDescription} numberOfLines={2}>
                          {classItem.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={[
                    styles.statusChip,
                    { backgroundColor: `${getStatusColor(classItem)}15` }
                  ]}>
                    <Text style={[styles.statusChipText, { color: getStatusColor(classItem) }]}>
                      {classItem.attendance_status.status}
                    </Text>
                  </View>
                </View>
                
                {/* Enhanced Attendance Timeline */}
                {(classItem.attendance_status.check_in_time || classItem.attendance_status.check_out_time) && (
                  <View style={styles.attendanceTimeline}>
                    <View style={styles.timelineContainer}>
                      {classItem.attendance_status.check_in_time && (
                        <View style={styles.timelineItem}>
                          <View style={[styles.timelineIcon, { backgroundColor: COLORS.success }]}>
                            <Ionicons name="log-in" size={14} color={COLORS.white} />
                          </View>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Checked In</Text>
                            <Text style={styles.timelineTime}>
                              {formatTime(classItem.attendance_status.check_in_time)}
                            </Text>
                          </View>
                        </View>
                      )}
                      
                      {classItem.attendance_status.check_out_time && (
                        <View style={styles.timelineItem}>
                          <View style={[styles.timelineIcon, { backgroundColor: COLORS.error }]}>
                            <Ionicons name="log-out" size={14} color={COLORS.white} />
                          </View>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Checked Out</Text>
                            <Text style={styles.timelineTime}>
                              {formatTime(classItem.attendance_status.check_out_time)}
                            </Text>
                          </View>
                        </View>
                      )}
                      
                      {classItem.attendance_status.check_in_time && (
                        <View style={styles.durationChip}>
                          <Ionicons name="time-outline" size={12} color={COLORS.text.secondary} />
                          <Text style={styles.durationChipText}>
                            {calculateDuration(
                              classItem.attendance_status.check_in_time,
                              classItem.attendance_status.check_out_time
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Enhanced Action Buttons with improved disabled states */}
                <View style={styles.actionSection}>
                  <Button
                    title={actionLoading === `class_checkin_${classItem.id}` ? "Checking In..." : "Check In"}
                    onPress={() => handleClassAttendance(classItem.id, classItem.name, 'class_checkin')}
                    disabled={
                      !!classItem.attendance_status.check_in_time || 
                      locationStatus !== 'inside' ||
                      actionLoading === `class_checkin_${classItem.id}`
                    }
                    loading={actionLoading === `class_checkin_${classItem.id}`}
                    variant="success"
                    size="small"
                    style={StyleSheet.flatten([
                      styles.actionButton, 
                      { 
                        flex: 1,
                        opacity: classItem.attendance_status.check_in_time ? 0.6 : 1
                      }
                    ])}
                  />
                  
                  <Button
                    title={actionLoading === `class_checkout_${classItem.id}` ? "Checking Out..." : "Check Out"}
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
                    style={StyleSheet.flatten([
                      styles.actionButton, 
                      { 
                        flex: 1,
                        opacity: (!classItem.attendance_status.check_in_time || classItem.attendance_status.check_out_time) ? 0.6 : 1
                      }
                    ])}
                  />
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="school-outline" size={48} color={COLORS.gray[400]} />
              </View>
              <Text style={styles.emptyTitle}>
                {selectedFilter === 'all' 
                  ? 'No Classes Assigned'
                  : `No ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Classes`
                }
              </Text>
              <Text style={styles.emptyDescription}>
                {selectedFilter === 'all' 
                  ? 'Contact your administrator to get assigned to classes, or pull down to refresh.'
                  : `Try selecting "All Classes" to see your complete class list, or change your filter selection.`
                }
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={16} color={COLORS.primary} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50] || '#f8f9fa',
  },
  
  content: {
    flex: 1,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    backgroundColor: COLORS.surface,
    paddingTop: LAYOUT.padding.base,
    paddingBottom: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
  },

  titleSection: {
    flex: 1,
  },

  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'] || 24,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  locationText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: LAYOUT.padding.base,
    gap: LAYOUT.spacing.sm,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: LAYOUT.padding.sm,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  statCardFirst: {
    // Add any special styling for first card if needed
  },

  statIconContainer: {
    marginBottom: 4,
  },

  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textAlign: 'center',
  },

  filterContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },

  filterScrollContent: {
    paddingHorizontal: LAYOUT.padding.base,
  },

  filterTab: {
    marginRight: LAYOUT.spacing.sm,
    borderRadius: 25,
    backgroundColor: COLORS.gray[100],
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  filterTabActive: {
    backgroundColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },

  filterTabText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },

  filterTabTextActive: {
    color: COLORS.white,
  },

  filterBadge: {
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },

  filterBadgeActive: {
    backgroundColor: COLORS.white + '30',
  },

  filterBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.secondary,
  },

  filterBadgeTextActive: {
    color: COLORS.white,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: LAYOUT.padding.base,
    paddingBottom: LAYOUT.padding.xl,
  },

  classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.xl,
    padding: LAYOUT.padding.base,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },

  // New style for active classes to provide visual feedback
  activeClassCard: {
    borderColor: COLORS.success,
    borderWidth: 2,
    shadowColor: COLORS.success,
    shadowOpacity: 0.15,
  },

  classHeader: {
    marginBottom: LAYOUT.spacing.base,
  },

  classMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.spacing.sm,
  },

  classStatusIndicator: {
    alignItems: 'center',
    marginRight: LAYOUT.spacing.sm,
    position: 'relative',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -2,
    right: -2,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  classDetails: {
    flex: 1,
  },

  className: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 4,
    lineHeight: 24,
  },

  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  classCode: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },

  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray[400],
    marginHorizontal: 8,
  },

  classDepartment: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  durationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  classDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.light,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },

  statusChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  attendanceTimeline: {
    backgroundColor: COLORS.gray[50],
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.sm,
    marginBottom: LAYOUT.spacing.base,
  },

  timelineContainer: {
    gap: LAYOUT.spacing.sm,
  },

  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
  },

  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineContent: {
    flex: 1,
  },

  timelineLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },

  timelineTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },

  durationChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  actionSection: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.sm,
    marginTop: 4,
  },

  actionButton: {
    borderRadius: LAYOUT.borderRadius.lg,
  },

  emptyState: {
    alignItems: 'center',
    padding: LAYOUT.padding.xl,
    marginTop: LAYOUT.spacing.xl * 2,
  },

  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.spacing.base,
  },

  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: LAYOUT.spacing.sm,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.padding.base,
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },

  refreshButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
});