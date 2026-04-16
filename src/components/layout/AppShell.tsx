"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import type { PlanTier } from "@prisma/client";

interface AppShellProps {
  planTier: PlanTier;
  children: React.ReactNode;
}

export function AppShell({ planTier, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AppSidebar
        planTier={planTier}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-4 md:p-6 bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
