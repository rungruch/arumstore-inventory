"use client";
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { User } from '@/app/firebase/interfaces';

interface ProtectedRouteProps {
  children: ReactNode;
  module?: keyof User['permissions'];
  action?: keyof User['permissions'][keyof User['permissions']];
  actions?: (keyof User['permissions'][keyof User['permissions']])[];
  requireAll?: boolean; // If true, requires ALL actions. If false, requires ANY action. Default: true
}

export default function ProtectedRoute({ 
  children, 
  module, 
  action = 'view',
  actions,
  requireAll = true
}: ProtectedRouteProps) {
  const { currentUser, loading, hasPermission } = useAuth();
  const router = useRouter();

  // Helper function to check multiple permissions
  const hasRequiredPermissions = (module: keyof User['permissions'], actionList: (keyof User['permissions'][keyof User['permissions']])[], requireAll: boolean): boolean => {
    if (requireAll) {
      // ALL actions must be granted
      return actionList.every(act => hasPermission(module, act));
    } else {
      // ANY action must be granted
      return actionList.some(act => hasPermission(module, act));
    }
  };

  useEffect(() => {
    // If authentication is done loading and user is not logged in
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    // If module is specified, check permission(s)
    if (!loading && currentUser && module) {
      let hasAccess = false;

      if (actions && actions.length > 0) {
        // Multiple actions specified
        hasAccess = hasRequiredPermissions(module, actions, requireAll);
      } else if (action) {
        // Single action specified
        hasAccess = hasPermission(module, action);
      }

      if (!hasAccess) {
        router.push('/unauthorized');
      }
    }
  }, [currentUser, loading, router, module, action, actions, requireAll, hasPermission]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
      </div>
    );
  }

  // If no module specified or user has permission(s), render children
  if (!module || (currentUser && (
    (actions && actions.length > 0 && hasRequiredPermissions(module, actions, requireAll)) ||
    (!actions && action && hasPermission(module, action))
  ))) {
    return <>{children}</>;
  }

  // Don't render anything while redirecting
  return null;
}