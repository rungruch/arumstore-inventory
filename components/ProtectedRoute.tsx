"use client";
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { User } from '@/app/firebase/interfaces';

interface ProtectedRouteProps {
  children: ReactNode;
  module?: keyof User['permissions'];
  action?: keyof User['permissions'][keyof User['permissions']];
}

export default function ProtectedRoute({ 
  children, 
  module, 
  action = 'view' 
}: ProtectedRouteProps) {
  const { currentUser, loading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authentication is done loading and user is not logged in
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    // If module and action are specified, check permission
    if (!loading && currentUser && module && !hasPermission(module, action)) {
      router.push('/unauthorized');
    }
  }, [currentUser, loading, router, module, action, hasPermission]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
      </div>
    );
  }

  // If no module/action specified or user has permission, render children
  if (!module || (currentUser && hasPermission(module, action))) {
    return <>{children}</>;
  }

  // Don't render anything while redirecting
  return null;
}