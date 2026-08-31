"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import BusinessHeader from "./BusinessHeader";
import BusinessSidebar from "./BusinessSidebar";

interface BusinessShellProps {
  children: ReactNode;
}

export default function BusinessShell({
  children,
}: BusinessShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <BusinessSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() =>
          setMobileSidebarOpen(false)
        }
      />

      <div className="min-h-screen lg:pl-[286px]">
        <BusinessHeader
          onOpenSidebar={() =>
            setMobileSidebarOpen(true)
          }
        />

        <main className="w-full">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8 lg:pb-16 lg:pt-7 2xl:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}