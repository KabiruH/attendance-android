// app/(tabs)/allClasses.tsx - All Classes Management Screen (Optional separate tab)
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants';
import { apiService } from '../../services/ApiService';

interface ClassItem {
  id: number;
  name: string;
  code: string;
  description?: string;
  department: string;
  duration_hours: number;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

export default function AllClassesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    loadAllClasses();
  }, [showActiveOnly]);

  const loadAllClasses = async () => {
    try {
      const response = await apiService.getAllClasses(showActiveOnly);
      if (response.success && response.data) {
        setAllClasses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading all classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllClasses();
  };

  const getDepartments = () => {
    const departments = [...new Set(allClasses.map(cls => cls.department))];
    return ['all', ...departments.sort()];
  };

  const getFilteredClasses = () => {
    let filtered = allClasses;
    
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(cls => cls.department === selectedDepartment);
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  const getClassStats = () => {
    const filteredClasses = getFilteredClasses();
    return {
      total: filteredClasses.length,
      active: filteredClasses.filter(cls => cls.is_active).length,
      inactive: filteredClasses.filter(cls => !cls.is_active).length,
      departments: getDepartments().length - 1, // Exclude 'all'
    };
  };

  const filteredClasses = getFilteredClasses();
  const stats = getClassStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContent}>
          <LoadingSpinner message="Loading all classes..." />
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
          <Text style={styles.title}>All Classes</Text>
          <Text style={styles.subtitle}>
            {filteredClasses.length} classes
            {selectedDepartment !== 'all' && ` in ${selectedDepartment}`}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowActiveOnly(!showActiveOnly)}
        >
          <Text style={styles.toggleText}>
            {showActiveOnly ? 'Show All' : 'Active Only'}
          </Text>
        </TouchableOpacity>
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
          <Text style={[styles.statValue, { color: COLORS.gray[500] }]}>{stats.inactive}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.departments}</Text>
          <Text style={styles.statLabel}>Departments</Text>
        </View>
      </View>

      {/* Department Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {getDepartments().map((department) => (
          <TouchableOpacity
            key={department}
            style={[
              styles.filterButton,
              selectedDepartment === department && styles.filterButtonActive
            ]}
            onPress={() => setSelectedDepartment(department)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedDepartment === department && styles.filterButtonTextActive
            ]}>
              {department === 'all' ? 'All Departments' : department}
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
                      backgroundColor: classItem.is_active ? COLORS.success : COLORS.gray[400]
                    }
                  ]}>
                    <Text style={styles.statusText}>
                      {classItem.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Class Details */}
              <View style={styles.classDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color={COLORS.gray[500]} />
                  <Text style={styles.detailText}>
                    Created: {new Date(classItem.created_at).toLocaleDateString()}
                  </Text>
                </View>
                
                {classItem.created_by && (
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={16} color={COLORS.gray[500]} />
                    <Text style={styles.detailText}>
                      Created by: {classItem.created_by}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>
              No classes found
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedDepartment !== 'all' 
                ? `No classes found in ${selectedDepartment} department`
                : showActiveOnly
                ? 'No active classes available'
                : 'No classes have been created yet'
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

  toggleButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  toggleText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
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

  classDetails: {
    paddingTop: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: 4,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  detailText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
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