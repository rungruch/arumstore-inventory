// components/theme-provider.jsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type PropsWithChildren } from "react";

export function ThemeProvider({ children, ...props }: PropsWithChildren<{}>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}