import { useEffect, useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
}

// Restaurant coordinates (to reject if driver location matches exactly)
const RESTAURANT_LAT = 42.9849;
const RESTAURANT_LNG = -81.2453;

export function useGeolocation(driverId: string | undefined, enabled: boolean = true) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const updateMutation = trpc.drivers.updateLocation.useMutation();

  useEffect(() => {
    if (!enabled || !driverId || !navigator.geolocation) {
      return;
    }

    // Start watching position immediately with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        
        // Validate: reject if coordinates match restaurant location exactly
        if (latitude === RESTAURANT_LAT && longitude === RESTAURANT_LNG) {
          console.warn('[useGeolocation] Rejecting restaurant coordinates');
          setGpsError('GPS location matches restaurant. Please move and try again.');
          return;
        }

        setPosition({ latitude, longitude });
        setPermissionDenied(false);
        setIsTracking(true);
        setGpsError(null);

        // Send real GPS coordinates to backend
        updateMutation.mutate({
          driverId: parseInt(driverId),
          latitude,
          longitude,
        });
      },
      (error) => {
        console.error('[useGeolocation] GPS error:', error);
        setIsTracking(false);
        
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setGpsError('Please enable location access to allow tracking');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsError('GPS location is not available');
        } else if (error.code === error.TIMEOUT) {
          setGpsError('GPS location request timed out');
        } else {
          setGpsError('Unable to get GPS location');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [driverId, enabled, updateMutation]);

  return {
    position,
    permissionDenied,
    isTracking,
    gpsError,
  };
}
