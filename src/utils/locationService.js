import { Geolocation } from '@capacitor/geolocation';

/**
 * Request native / web GPS location permissions
 */
export const requestLocationPermissions = async () => {
  try {
    if (Geolocation && typeof Geolocation.requestPermissions === 'function') {
      const status = await Geolocation.requestPermissions();
      return status?.location === 'granted' || status?.coarseLocation === 'granted';
    }
  } catch (err) {
    console.warn('Native geolocation permission request failed or not supported:', err.message);
  }
  return true;
};

/**
 * Get current device GPS location with high accuracy
 */
export const getCurrentDeviceLocation = async (timeoutMs = 10000) => {
  // 1. Try Capacitor native Geolocation plugin
  try {
    if (Geolocation && typeof Geolocation.getCurrentPosition === 'function') {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 5000
      });
      if (position?.coords?.latitude && position?.coords?.longitude) {
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
          timestamp: position.timestamp || Date.now(),
          source: 'GPS_NATIVE'
        };
      }
    }
  } catch (capErr) {
    console.warn('Capacitor Geolocation error:', capErr.message);
  }

  // 2. Fallback to standard browser navigator.geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 0,
            timestamp: pos.timestamp || Date.now(),
            source: 'GPS_BROWSER'
          });
        },
        (err) => {
          console.warn('Browser navigator.geolocation error:', err.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 5000
        }
      );
    });
  }

  return null;
};

/**
 * Watch device GPS location in real time
 */
export const watchDeviceLocation = (onLocationUpdate) => {
  let watchId = null;
  let isCapacitor = false;

  // Try Capacitor watch
  try {
    if (Geolocation && typeof Geolocation.watchPosition === 'function') {
      Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
        (position, err) => {
          if (err) {
            console.warn('Capacitor watchPosition error:', err);
            return;
          }
          if (position?.coords) {
            onLocationUpdate({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy || 0,
              timestamp: position.timestamp || Date.now(),
              source: 'GPS_NATIVE_WATCH'
            });
          }
        }
      ).then(id => {
        watchId = id;
        isCapacitor = true;
      }).catch(err => {
        console.warn('Capacitor watchPosition failed, fallback to navigator:', err.message);
        fallbackBrowserWatch();
      });
      return () => {
        if (watchId && isCapacitor && Geolocation.clearWatch) {
          Geolocation.clearWatch({ id: watchId });
        }
      };
    }
  } catch (e) {
    console.warn('Capacitor watchPosition exception:', e);
  }

  const fallbackBrowserWatch = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const bWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          onLocationUpdate({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 0,
            timestamp: pos.timestamp || Date.now(),
            source: 'GPS_BROWSER_WATCH'
          });
        },
        (err) => console.warn('Browser watchPosition error:', err.message),
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
      watchId = bWatchId;
    }
  };

  fallbackBrowserWatch();

  return () => {
    if (watchId && !isCapacitor && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
};

/**
 * Standard Haversine distance calculator returning KM rounded to 1 decimal place
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return '0.0';
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};
