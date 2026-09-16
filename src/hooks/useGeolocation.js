import { useCallback, useState } from "react";

/**
 * One-shot GPS read for attendance punches. Returns `request()` which resolves
 * to { latitude, longitude, accuracyMeters } or rejects with a readable error.
 */
export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(() => {
    setError(null);
    setLoading(true);
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        const e = new Error("This device does not support location services.");
        setError(e.message);
        setLoading(false);
        reject(e);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracyMeters: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
          });
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied. Enable it in your browser to clock in."
              : err.code === err.TIMEOUT
                ? "Timed out getting your location. Try again."
                : "Could not determine your location.";
          setError(message);
          setLoading(false);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }, []);

  return { request, loading, error };
}

export default useGeolocation;
