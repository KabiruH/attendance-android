// app/(tabs)/attendance.tsx - Attendance History with Monthly Stats
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Attendance screen focused, refreshing data...');
      loadAttendanceHistory();
    }, [])
  );

  const loadAttendanceHistory = async () => {
    try {
      console.log('📊 Loading attendance history...');
      const response = await apiService.getAttendanceData();

      console.log('🔍 Attendance history response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // The history is nested under data.work.history based on our fixed API service
        const history = response.data.work?.history || response.data.history || [];

        console.log(`✅ Found ${history.length} attendance records`);

        // Sort by date (most recent first)
        const sortedHistory = [...history].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA; // Descending order (newest first)
        });

        setAttendanceHistory(sortedHistory);
      } else {
        console.log('❌ No attendance data found in response');
        setAttendanceHistory([]);
      }
    } catch (error) {
      console.error('💥 Error loading attendance history:', error);
      setAttendanceHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceHistory();
  };

  const formatKenyaTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-KE', {
      timeZone: 'Africa/Nairobi',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatKenyaDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      timeZone: 'Africa/Nairobi',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return COLORS.success;
      case 'Late': return COLORS.warning;
      case 'Absent': return COLORS.error;
      default: return COLORS.gray[400];
    }
  };

  const calculateWorkHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn) return null;

    // Parse times and ensure they're in Kenya timezone context
    const startTime = new Date(checkIn);
    const endTime = checkOut ? new Date(checkOut) : new Date();

    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  // Calculate monthly stats (current month only)
  const calculateMonthlyStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter records for current month only
    const currentMonthRecords = attendanceHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === currentMonth &&
        recordDate.getFullYear() === currentYear;
    });

    const totalDays = currentMonthRecords.length;
    const presentDays = currentMonthRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const onTimeDays = currentMonthRecords.filter(r => r.status === 'Present').length;
    const lateDays = currentMonthRecords.filter(r => r.status === 'Late').length;
    const absentDays = currentMonthRecords.filter(r => r.status === 'Absent').length;

    // Calculate attendance percentage for the month
    const attendancePercentage = totalDays > 0
      ? Math.round((presentDays / totalDays) * 100)
      : 0;

    return {
      month: now.toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi',
        month: 'long',
        year: 'numeric'
      }),
      totalDays,
      presentDays,
      onTimeDays,
      lateDays,
      absentDays,
      attendancePercentage
    };
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

  // Get monthly stats
  const monthlyStats = calculateMonthlyStats();

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

        {/* Monthly Stats Summary */}
        {attendanceHistory.length > 0 && (
          <>
            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle}>{monthlyStats.month}</Text>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageText}>{monthlyStats.attendancePercentage}%</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.totalDays}</Text>
                <Text style={styles.statLabel}>Days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>{monthlyStats.onTimeDays}</Text>
                <Text style={styles.statLabel}>On Time</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: COLORS.warning }]}>{monthlyStats.lateDays}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>{monthlyStats.absentDays}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>
          </>
        )}

        {attendanceHistory.length > 0 ? (
          attendanceHistory.map((record: any, index: number) => {
            const workHours = calculateWorkHours(record.check_in_time, record.check_out_time);
            const isToday = new Date(record.date).toDateString() === new Date().toDateString();

            return (
              <View
                key={record.id || index}
                style={[
                  styles.attendanceCard,
                  isToday && styles.todayCard
                ]}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.dateText}>
                      {new Date(record.date).toLocaleDateString('en-KE', {
                        timeZone: 'Africa/Nairobi',
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    {isToday && (
                      <Text style={styles.todayLabel}>Today</Text>
                    )}
                  </View>
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
                        {new Date(record.check_in_time).toLocaleTimeString('en-KE', {
                          timeZone: 'Africa/Nairobi',
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
                        {new Date(record.check_out_time).toLocaleTimeString('en-KE', {
                          timeZone: 'Africa/Nairobi',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}

                  {workHours && (
                    <View style={styles.timeItem}>
                      <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.timeText}>{workHours}</Text>
                    </View>
                  )}
                </View>

                {/* Show if currently checked in (no checkout time and it's today) */}
                {isToday && record.check_in_time && !record.check_out_time && (
                  <View style={styles.activeIndicator}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Currently checked in</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>No attendance records found</Text>
            <Text style={styles.emptySubtext}>
              Your attendance history will appear here once you start checking in
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

  scrollContent: {
    padding: LAYOUT.padding.base,
  },

  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: LAYOUT.spacing.lg,
  },

  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.base,
  },

  monthTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },

  percentageBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  percentageText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },

  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.base,
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
  },

  attendanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.base,
    marginBottom: LAYOUT.spacing.base,
    ...LAYOUT.shadow.sm,
  },

  todayCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
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

  todayLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginTop: 2,
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
    flexWrap: 'wrap',
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

  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: LAYOUT.spacing.sm,
    paddingTop: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },

  activeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
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

  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.light,
    marginTop: LAYOUT.spacing.xs,
    textAlign: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
  },
});