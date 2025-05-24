'use client';

import { createContext, useContext, ReactNode, useTransition, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationLoadingContextType {
  isPending: boolean;
  navigate: (url: string) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isPending: false,
  navigate: () => {},
});

export const useNavigationLoading = () => {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  }
  return context;
};

interface NavigationLoadingProviderProps {
  children: ReactNode;
}

export function NavigationLoadingProvider({ children }: NavigationLoadingProviderProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const navigate = (url: string) => {
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <NavigationLoadingContext.Provider value={{ 
      isPending, 
      navigate
    }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}
