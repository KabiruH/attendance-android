
// // app/_layout.tsx - Root Layout (Main App Entry Point)
// import { useEffect, useState } from 'react';
// import { Slot, SplashScreen, router } from 'expo-router';
// import { StorageService } from '../services/StorageService';

// // Prevent the splash screen from auto-hiding
// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
//   const [isReady, setIsReady] = useState(false);

//   useEffect(() => {
//     async function prepare() {
//       try {
//         // Check authentication status
//         const token = await StorageService.getUserToken();
//         const userData = await StorageService.getUserData();
        
//         if (token && userData) {
//           // User is authenticated, go to main app
//           router.replace('/(tabs)');
//         } else {
//           // User is not authenticated, go to login
//           router.replace('/(auth)/login');
//         }
        
//         // Simulate loading time (remove in production)
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       } catch (e) {
//         console.warn('Error during app initialization:', e);
//         // On error, redirect to login
//         router.replace('/(auth)/login');
//       } finally {
//         setIsReady(true);
//         SplashScreen.hideAsync();
//       }
//     }

//     prepare();
//   }, []);

//   if (!isReady) {
//     return null;
//   }

//   return <Slot />;
// }