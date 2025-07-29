// app/index.tsx - Simple Entry Point
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StorageService } from '../services/StorageService';
import { COLORS } from '../constants';

export default function Index() {
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Add a small delay to prevent flash
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const token = await StorageService.getUserToken();
      const userData = await StorageService.getUserData();
      
      if (token && userData) {
        // User is authenticated, go to main app
        router.replace('/(tabs)');
      } else {
        // User is not authenticated, go to login
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // On error, redirect to login
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <LoadingSpinner message="Loading..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});