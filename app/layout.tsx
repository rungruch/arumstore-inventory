import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/app/sidebar"; 
import "./globals.css";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arum",
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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" sizes="any"/>
      <link
      rel="icon"
      href="/icon.png"
      sizes="any"
      />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased h-full` }>
      <AdminPanelLayout>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ContentLayout>
        {children}
        </ContentLayout>
        </ThemeProvider>
      </AdminPanelLayout>
      </body>
    </html>
  );
}
