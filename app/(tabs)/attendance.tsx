// app/(tabs)/attendance.tsx - Complete Attendance History Screen
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants';
import { apiService } from '../../services/ApiService';

export default function AttendanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    try {
      const response = await apiService.getAttendanceData();
      if (response.success && response.data) {
        setAttendanceHistory(response.data.history || []);
      }
    } catch (error) {
      console.error('Error loading attendance history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceHistory();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return COLORS.success;
      case 'Late': return COLORS.warning;
      case 'Absent': return COLORS.error;
      default: return COLORS.gray[400];
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContent}>
          <LoadingSpinner message="Loading attendance history..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Attendance History</Text>
        
        {attendanceHistory.length > 0 ? (
          attendanceHistory.map((record: any, index: number) => (
            <View key={index} style={styles.attendanceCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.dateText}>
                  {new Date(record.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(record.status) }
                ]}>
                  <Text style={styles.statusText}>{record.status}</Text>
                </View>
              </View>
              
              <View style={styles.timeRow}>
                {record.check_in_time && (
                  <View style={styles.timeItem}>
                    <Ionicons name="log-in" size={16} color={COLORS.success} />
                    <Text style={styles.timeText}>
                      {new Date(record.check_in_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
                
                {record.check_out_time && (
                  <View style={styles.timeItem}>
                    <Ionicons name="log-out" size={16} color={COLORS.error} />
                    <Text style={styles.timeText}>
                      {new Date(record.check_out_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>No attendance records found</Text>
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
  
  scrollContent: {
    padding: LAYOUT.padding.base,
  },
  
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: LAYOUT.spacing.xl,
  },
  
  attendanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
    ...LAYOUT.shadow.sm,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  
  dateText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
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
  
  timeRow: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.lg,
  },
  
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  timeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  
  emptyState: {
    alignItems: 'center',
    padding: LAYOUT.padding.xl,
    marginTop: LAYOUT.spacing.xl,
  },
  
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginTop: LAYOUT.spacing.base,
    textAlign: 'center',
  },
});