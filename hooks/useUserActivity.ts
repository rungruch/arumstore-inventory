/**
 * React hook for tracking user activity and session management
 */
"use client";

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { trackUserActivity } from '@/lib/auth-utils';

interface UseUserActivityOptions {
  trackOnMount?: boolean;
  trackOnVisibilityChange?: boolean;
  trackOnClick?: boolean;
  trackOnKeyboard?: boolean;
  throttleMs?: number;
}

export function useUserActivity(options: UseUserActivityOptions = {}) {
  const { currentUser } = useAuth();
  const {
    trackOnMount = true,
    trackOnVisibilityChange = true,
    trackOnClick = true,
    trackOnKeyboard = true,
    throttleMs = 30000 // 30 seconds throttle by default
  } = options;

  // Throttled activity tracker
  const throttledTrackActivity = useCallback(
    throttle((activityType = 'page_interaction') => {
      if (currentUser?.uid) {
        trackUserActivity(
          currentUser.uid,
          activityType,
          {
            page: typeof window !== 'undefined' ? window.location.pathname : ''
          }
        );
      }
    }, throttleMs),
    [currentUser?.uid, throttleMs]
  );

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Track activity on mount
    if (trackOnMount) {
      throttledTrackActivity('page_mount');
    }

    const handlers: { event: string; handler: () => void }[] = [];

    // Track on user interactions
    if (trackOnClick) {
      const clickHandler = () => throttledTrackActivity('click_interaction');
      document.addEventListener('click', clickHandler);
      handlers.push({ event: 'click', handler: clickHandler });
    }

    if (trackOnKeyboard) {
      const keyHandler = () => throttledTrackActivity('keyboard_interaction');
      document.addEventListener('keydown', keyHandler);
      handlers.push({ event: 'keydown', handler: keyHandler });
    }

    // Track on visibility change (tab focus/blur)
    if (trackOnVisibilityChange) {
      const visibilityHandler = () => {
        if (!document.hidden) {
          throttledTrackActivity('visibility_change');
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      handlers.push({ event: 'visibilitychange', handler: visibilityHandler });
    }

    // Cleanup event listeners
    return () => {
      handlers.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler);
      });
    };
  }, [currentUser?.uid, throttledTrackActivity, trackOnMount, trackOnVisibilityChange, trackOnClick, trackOnKeyboard]);

  return {
    trackActivity: (activityType?: string, customMetadata?: any) => {
      if (currentUser?.uid) {
        const metadata = {
          page: typeof window !== 'undefined' ? window.location.pathname : '',
          ...customMetadata
        };
        trackUserActivity(currentUser.uid, activityType || 'custom_interaction', metadata);
      }
    }
  };
}

// Simple throttle utility
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastArgs: Parameters<T> | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    // Save the last arguments to potentially use later
    lastArgs = args;
    
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        
        // If there were additional calls during the throttle period,
        // use the most recent arguments
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
  };
}
