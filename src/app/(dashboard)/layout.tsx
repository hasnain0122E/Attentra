import type { ReactNode } from "react";

import DashboardShell from "@/components/dashboard/DashboardShell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}