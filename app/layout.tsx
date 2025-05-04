import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { ClientThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { ContentLayout } from "@/components/admin-panel/content-layout";

// Use consistent naming for font variables
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arum Inventory",
  description: "Arum Store Inventory Management System",
  openGraph: {
    title: "Arum",
    description: "Arum Store Inventory Management System",
    siteName: "Arum",
    locale: "en_US",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use string literals to ensure consistent class names between server and client
  const fontClasses = `${geistSans.variable} ${geistMono.variable}`;
  
  return (
    <html lang="en" className={fontClasses} 
      // Suppress hydration warnings caused by theme switching between server and client render
    suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ClientThemeProvider>
            <AdminPanelLayout>
              <ContentLayout>{children}</ContentLayout>
            </AdminPanelLayout>
          </ClientThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}