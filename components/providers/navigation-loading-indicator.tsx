'use client';

import { useNavigationLoading } from './navigation-loading-provider';

export function NavigationLoadingIndicator() {
  const { isPending } = useNavigationLoading();

  if (!isPending) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Clean, simple progress bar that matches Next.js behavior */}
      <div className="h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600">
        <div className="h-full w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 animate-pulse" />
      </div>
    </div>
  );
}
