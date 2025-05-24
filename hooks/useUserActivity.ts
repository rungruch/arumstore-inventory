/**
 * React hook for tracking employee activity and workplace monitoring
 * Optimized intervals for employee action tracking
 */
"use client";

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth, useIsAuthenticated } from '@/app/contexts/AuthContext';
import { trackUserActivity } from '@/lib/auth-utils';

interface UseUserActivityOptions {
  trackOnMount?: boolean;
  trackOnVisibilityChange?: boolean;
  trackOnClick?: boolean;
  trackOnKeyboard?: boolean;
  throttleMs?: number;
  // Activity-specific intervals for better control
  activityIntervals?: {
    click?: number;
    keyboard?: number;
    visibility?: number;
    pageMount?: number;
    general?: number;
  };
  // Preset profile optimized for employee tracking
  profile?: 'standard';
}

export function useUserActivity(options: UseUserActivityOptions = {}) {
  const { currentUser } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  
  // Use refs to avoid re-creating functions when user data changes
  const currentUserRef = useRef(currentUser);
  const lastActivityRef = useRef<{ [key: string]: number }>({});
  
  // Update ref when currentUser changes (doesn't trigger re-renders)
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Define intervals optimized for employee activity tracking
  const getDefaultIntervals = (profile: string) => {
    switch (profile) {
      case 'standard':
        return {
          click: 60000,         // 1 minute - employee interactions
          keyboard: 30000,      // 30 seconds - active typing/work
          visibility: 60000,    // 1 minute - focus tracking
          pageMount: 10000,     // 10 seconds - navigation patterns
          general: 120000       // 2 minutes - general employee activity
        };
      default:
        return {
          click: 300000,        // 5 minutes - standard profile
          keyboard: 600000,     // 10 minutes
          visibility: 120000,   // 2 minutes
          pageMount: 30000,     // 30 seconds
          general: 300000       // 5 minutes default
        };
    }
  };

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => {
    const profile = options.profile || 'standard';
    const defaultIntervals = getDefaultIntervals(profile);
    
    return {
      trackOnMount: options.trackOnMount ?? true,
      trackOnVisibilityChange: options.trackOnVisibilityChange ?? true,
      trackOnClick: options.trackOnClick ?? true,
      trackOnKeyboard: options.trackOnKeyboard ?? false, // Disabled by default for privacy
      throttleMs: options.throttleMs ?? defaultIntervals.general,
      activityIntervals: {
        ...defaultIntervals,
        ...options.activityIntervals
      },
      profile
    };
  }, [
    options.trackOnMount, 
    options.trackOnVisibilityChange, 
    options.trackOnClick, 
    options.trackOnKeyboard, 
    options.throttleMs, 
    options.profile,
    JSON.stringify(options.activityIntervals) // Deep comparison for object
  ]);

  const { trackOnMount, trackOnVisibilityChange, trackOnClick, trackOnKeyboard, activityIntervals } = memoizedOptions;

  // Optimized activity tracker using refs and activity-specific intervals
  const trackActivityOptimized = useCallback((activityType = 'page_interaction') => {
    const user = currentUserRef.current;
    if (!user?.uid) return;

    const now = Date.now();
    const lastActivity = lastActivityRef.current[activityType] || 0;
    
    // Get interval for this specific activity type
    const getInterval = (type: string) => {
      const intervals = activityIntervals;
      switch (type) {
        case 'click_interaction':
        case 'click':
          return intervals.click;
        case 'keyboard_interaction':
        case 'keyboard':
          return intervals.keyboard;
        case 'visibility_change':
        case 'visibility':
          return intervals.visibility;
        case 'page_mount':
          return intervals.pageMount;
        default:
          return intervals.general;
      }
    };
    
    const interval = getInterval(activityType);
    
    // Check if enough time has passed (client-side throttling)
    if (now - lastActivity < interval) return;
    
    lastActivityRef.current[activityType] = now;
    
    // Use requestIdleCallback for better performance if available
    const executeTracking = () => {
      trackUserActivity(
        user.uid,
        activityType,
        {
          page: typeof window !== 'undefined' ? window.location.pathname : '',
          timestamp: now,
          interval_used: interval // Track which interval was used for debugging
        }
      );
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(executeTracking, { timeout: 2000 });
    } else {
      // Defer to next tick for better performance
      setTimeout(executeTracking, 0);
    }
  }, [activityIntervals]); // Depend on activityIntervals instead of throttleMs

  // Memoized event handlers to prevent unnecessary re-creation
  const eventHandlers = useMemo(() => {
    const handlers: { event: string; handler: () => void }[] = [];
    
    if (trackOnClick) {
      const clickHandler = () => trackActivityOptimized('click_interaction');
      handlers.push({ event: 'click', handler: clickHandler });
    }

    if (trackOnKeyboard) {
      const keyHandler = () => trackActivityOptimized('keyboard_interaction');
      handlers.push({ event: 'keydown', handler: keyHandler });
    }

    if (trackOnVisibilityChange) {
      const visibilityHandler = () => {
        if (!document.hidden) {
          trackActivityOptimized('visibility_change');
        }
      };
      handlers.push({ event: 'visibilitychange', handler: visibilityHandler });
    }

    return handlers;
  }, [trackOnClick, trackOnKeyboard, trackOnVisibilityChange, trackActivityOptimized]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Track activity on mount
    if (trackOnMount) {
      trackActivityOptimized('page_mount');
    }

    // Add event listeners using memoized handlers
    eventHandlers.forEach(({ event, handler }) => {
      document.addEventListener(event, handler, { passive: true }); // Use passive listeners for better performance
    });

    // Cleanup event listeners
    return () => {
      eventHandlers.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler);
      });
    };
  }, [isAuthenticated, trackOnMount, trackActivityOptimized, eventHandlers]);

  // Memoized return value to prevent unnecessary re-renders of consuming components
  return useMemo(() => ({
    trackActivity: (activityType?: string, customMetadata?: any) => {
      const user = currentUserRef.current;
      if (user?.uid) {
        const metadata = {
          page: typeof window !== 'undefined' ? window.location.pathname : '',
          ...customMetadata
        };
        trackUserActivity(user.uid, activityType || 'custom_interaction', metadata);
      }
    }
  }), []); // Empty dependency array since we use refs
}

// Performance-optimized throttle utility with better memory management
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastExecTime >= limit) {
      // Execute immediately if enough time has passed
      lastExecTime = now;
      func.apply(this, args);
    } else if (!timeoutId) {
      // Schedule execution for later if not already scheduled
      const remainingTime = limit - (now - lastExecTime);
      timeoutId = setTimeout(() => {
        lastExecTime = Date.now();
        timeoutId = null;
        func.apply(this, args);
      }, remainingTime);
    }
  };
}
