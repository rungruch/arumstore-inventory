"use client";

import { Sidebar } from "@/components/admin-panel/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { useIsAuthenticated } from "@/app/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/admin-panel/footer";

export default function AdminPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useIsAuthenticated();
  const sidebar = useStore(useSidebar, (x) => x);
  if (!sidebar) return null;
  const { getOpenState, settings } = sidebar;
  
  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          // Only apply sidebar margins if user is logged in
          isAuthenticated && !settings.disabled && (!getOpenState() ? "lg:ml-[90px]" : "lg:ml-72")
        )}
      >
        {children}
      </main>
    </>
  );
}
