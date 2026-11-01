"use client";

import { useState, useCallback } from "react";

export interface CapturedGpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UseGeolocationCaptureOptions {
  /**
   * Accuracy threshold in meters. Captures with accuracy <= threshold
   * are treated as high accuracy and immediately applied.
   * Captures with accuracy > threshold are staged in `pendingCoords`
   * and require explicit confirmation.
   * Default: 50 meters.
   */
  accuracyThreshold?: number;
  /**
   * Geolocation timeout in milliseconds. Default: 15000ms (15 seconds).
   */
  timeoutMs?: number;
  /**
   * Optional callback invoked immediately when high-accuracy coordinates are captured.
   */
  onHighAccuracyCapture?: (coords: CapturedGpsPosition) => void;
  /**
   * Optional callback invoked when low-accuracy coordinates require user confirmation.
   */
  onLowAccuracyPending?: (coords: CapturedGpsPosition) => void;
}

export interface UseGeolocationCaptureReturn {
  isCapturing: boolean;
  accuracy: number | null;
  pendingCoords: CapturedGpsPosition | null;
  error: string | null;
  capture: () => void;
  confirmPending: () => CapturedGpsPosition | null;
  dismissPending: () => void;
  clearError: () => void;
}

export function useGeolocationCapture(
  options: UseGeolocationCaptureOptions = {}
): UseGeolocationCaptureReturn {
  const {
    accuracyThreshold = 50,
    timeoutMs = 15000,
    onHighAccuracyCapture,
    onLowAccuracyPending,
  } = options;

  const [isCapturing, setIsCapturing] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [pendingCoords, setPendingCoords] = useState<CapturedGpsPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const dismissPending = useCallback(() => setPendingCoords(null), []);

  const confirmPending = useCallback(() => {
    if (!pendingCoords) return null;
    const confirmed = { ...pendingCoords };
    setAccuracy(confirmed.accuracy);
    setPendingCoords(null);
    return confirmed;
  }, [pendingCoords]);

  const capture = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsCapturing(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturing(false);
        const capturedAccuracy = pos.coords.accuracy;
        const coords: CapturedGpsPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: capturedAccuracy,
        };

        if (capturedAccuracy > accuracyThreshold) {
          // Low-accuracy GPS (> threshold): require explicit user confirmation
          setPendingCoords(coords);
          onLowAccuracyPending?.(coords);
        } else {
          // High-accuracy GPS (<= threshold): auto-commit directly
          setPendingCoords(null);
          setAccuracy(capturedAccuracy);
          onHighAccuracyCapture?.(coords);
        }
        setError(null);
      },
      (err) => {
        setIsCapturing(false);
        // Error preservation: GPS failure never clears existing coordinates
        let userFriendlyMsg = "Failed to detect GPS coordinates";
        if (err.code === 1) {
          userFriendlyMsg = "Location access denied. Please enable location permissions or enter coordinates manually.";
        } else if (err.code === 2) {
          userFriendlyMsg = "Location unavailable. Please check your GPS signal or enter coordinates manually.";
        } else if (err.code === 3) {
          userFriendlyMsg = "GPS request timed out. Please retry or enter coordinates manually.";
        }
        setError(userFriendlyMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  }, [accuracyThreshold, timeoutMs, onHighAccuracyCapture, onLowAccuracyPending]);

  return {
    isCapturing,
    accuracy,
    pendingCoords,
    error,
    capture,
    confirmPending,
    dismissPending,
    clearError,
  };
}
