// services/LocationService.ts 
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { GEOFENCE } from '../constants';
import { LocationData } from '../types';

export interface LocationResult {
  success: boolean;
  location?: LocationData;
  withinGeofence?: boolean;
  error?: string;
  distance?: number;
}

export class LocationService {
  private static isWeb = Platform.OS === 'web';

  static async requestLocationPermission(): Promise<boolean> {
    if (this.isWeb) {
      // On web, use browser geolocation API
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            resolve(result.state === 'granted' || result.state === 'prompt');
          }).catch(() => {
            // Fallback: assume permission available
            resolve(true);
          });
        });
      }
      return false;
    }
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  static async getCurrentLocation(): Promise<LocationResult> {
    try {
      if (this.isWeb) {
        // Use browser geolocation API
        return new Promise((resolve) => {
          if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            resolve({
              success: false,
              error: 'Geolocation not supported in this browser',
            });
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const locationData: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy || 0,
                timestamp: position.timestamp,
              };

              // Check if within geofence
              const distance = this.calculateDistance(
                locationData.latitude,
                locationData.longitude,
                GEOFENCE.latitude,
                GEOFENCE.longitude
              );

              const withinGeofence = distance <= GEOFENCE.radius;

              resolve({
                success: true,
                location: locationData,
                withinGeofence,
                distance: Math.round(distance),
              });
            },
            (error) => {
              let errorMessage = 'Failed to get location';
              
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location permission denied';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information unavailable';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out';
                  break;
              }

              resolve({
                success: false,
                error: errorMessage,
              });
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        });
      }

      // Mobile version using Expo Location
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Location permission denied',
        };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };

      // Check if within geofence
      const distance = this.calculateDistance(
        locationData.latitude,
        locationData.longitude,
        GEOFENCE.latitude,
        GEOFENCE.longitude
      );

      const withinGeofence = distance <= GEOFENCE.radius;

      return {
        success: true,
        location: locationData,
        withinGeofence,
        distance: Math.round(distance),
      };
    } catch (error: any) {
      console.error('Error getting location:', error);
      return {
        success: false,
        error: error.message || 'Failed to get location',
      };
    }
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  static async isWithinGeofence(): Promise<boolean> {
    const result = await this.getCurrentLocation();
    return result.withinGeofence || false;
  }

  // Development helper for web testing
  static async mockLocationForDevelopment(
    lat: number = GEOFENCE.latitude,
    lng: number = GEOFENCE.longitude
  ): Promise<LocationResult> {
    if (!this.isWeb) {
      console.warn('Mock location is only for web development');
      return this.getCurrentLocation();
    }

    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      timestamp: Date.now(),
    };

    const distance = this.calculateDistance(
      lat,
      lng,
      GEOFENCE.latitude,
      GEOFENCE.longitude
    );

    return {
      success: true,
      location: locationData,
      withinGeofence: distance <= GEOFENCE.radius,
      distance: Math.round(distance),
    };
  }

  // Development helper
  static getPlatformInfo(): string {
    return `Platform: ${Platform.OS}, Location: ${this.isWeb ? 'Browser API' : 'Expo Location'}`;
  }
}