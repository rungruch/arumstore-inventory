'use client';

import { createContext, useContext, useState, ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationLoadingContextType {
  isLoading: boolean;
  navigateTo: (url: string) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isLoading: false,
  navigateTo: () => {},
});

export const useNavigationLoading = () => {
  return useContext(NavigationLoadingContext);
};

interface NavigationLoadingProviderProps {
  children: ReactNode;
}

export function NavigationLoadingProvider({ children }: NavigationLoadingProviderProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const navigateTo = (url: string) => {
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <NavigationLoadingContext.Provider value={{ 
      isLoading: isPending, 
      navigateTo 
    }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}
