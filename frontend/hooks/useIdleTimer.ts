import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeoutMs: number;
  onIdle: () => void;
  enabled?: boolean;
}

/**
 * Custom hook that listens for user activity events and triggers onIdle
 * after a specified duration of inactivity.
 */
export function useIdleTimer({ timeoutMs, onIdle, enabled = true }: UseIdleTimerOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onIdle();
    }, timeoutMs);
  }, [enabled, timeoutMs, onIdle]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimer]);

  return { resetTimer };
}
