// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { COLORS } from '../../constants/Index';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{
          title: 'Sign In',
          headerShown: false, // Hide header for login screen
        }}
      />
      <Stack.Screen 
        name="biometric-setup" 
        options={{
          title: 'Setup Biometric Authentication',
          headerBackTitle: 'Back',
          gestureEnabled: false, // Prevent swipe back
        }}
      />
    </Stack>
  );
}

