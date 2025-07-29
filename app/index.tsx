// app/index.tsx (Entry Point)
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useEffect } from 'react';
import { StorageService } from '@/services/StorageService';
import { COLORS } from '@/constants/Colors';

export default function Index() {
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
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