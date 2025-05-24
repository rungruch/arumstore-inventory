'use client';

import { useState, useEffect } from 'react';
import { useNavigationLoading } from './navigation-loading-provider';

export function NavigationLoadingIndicator() {
  const { isLoading } = useNavigationLoading();
  const [showLoading, setShowLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Smart loading threshold - only show after 150ms to prevent flash on fast navigations
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading) {
      timer = setTimeout(() => setShowLoading(true), 150);
    } else {
      setShowLoading(false);
    }
    
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Animated progress bar that actually progresses over time
  useEffect(() => {
    if (isLoading && showLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          // Progressive loading: fast start, then slow down, never reach 100% until done
          if (prev < 30) return prev + Math.random() * 15 + 5;
          if (prev < 60) return prev + Math.random() * 8 + 2;
          if (prev < 85) return prev + Math.random() * 3 + 1;
          return Math.min(prev + Math.random() * 1, 95); // Cap at 95% until navigation completes
        });
      }, 200);
      return () => clearInterval(interval);
    } else if (!isLoading && progress > 0) {
      // Complete the progress bar quickly when navigation finishes
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
        setShowLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, showLoading, progress]);

  if (!showLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Enhanced progress bar */}
      <div className="h-1 bg-blue-200/30 dark:bg-blue-900/30 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 transition-all duration-200 ease-out shadow-sm"
          style={{
            width: `${progress}%`,
            boxShadow: progress > 0 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
          }}
        />
      </div>
      
      {/* Optional: Full screen overlay with spinner (uncomment if you want this) */}
      {/* 
      <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
            <span className="text-gray-700 dark:text-gray-300">กำลังโหลด...</span>
          </div>
        </div>
      </div>
      */}
    </div>
  );
}
