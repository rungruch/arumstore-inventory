"use client";

import { useState, useEffect, ReactNode } from "react";
import { ThemeProvider } from "next-themes";

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Only render theme content when mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return children without theme provider during SSR
    return <>{children}</>;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
