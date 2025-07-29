// app/_layout.tsx (Root Layout)
import { Slot, SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/StorageService';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any data you need here
        // For example, check authentication status
        await StorageService.getUserToken();
        
        // Simulate loading time (remove in production)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  return <Slot />;
}

