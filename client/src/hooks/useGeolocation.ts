import { useEffect, useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
}

export function useGeolocation(driverId: string | undefined, enabled: boolean = true) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const updateMutation = trpc.gps.updateDriverPosition.useMutation();

  useEffect(() => {
    if (!enabled || !driverId || !navigator.geolocation) {
      return;
    }

    // Request permission and start tracking
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ latitude, longitude });
        setPermissionDenied(false);

        // Send initial position
        updateMutation.mutate({
          driverId,
          latitude,
          longitude,
        });

        // Watch position and update every 10 seconds
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setPosition({ latitude, longitude });

            // Send position update
            updateMutation.mutate({
              driverId,
              latitude,
              longitude,
            });
          },
          (error) => {
            console.error('[useGeolocation] Error:', error);
            if (error.code === error.PERMISSION_DENIED) {
              setPermissionDenied(true);
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      },
      (error) => {
        console.error('[useGeolocation] Permission error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
        }
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
    isTracking: position !== null && !permissionDenied,
  };
}
