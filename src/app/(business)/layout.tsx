import type {
  ReactNode,
} from "react";

import BusinessShell from "@/components/business/BusinessShell";
import {
  BusinessProvider,
} from "@/components/business/BusinessContext";

import {
  getActiveBusiness,
} from "@/lib/business/context";

interface BusinessLayoutProps {
  children: ReactNode;
}

export default async function BusinessLayout({
  children,
}: BusinessLayoutProps) {
  const business =
    await getActiveBusiness();

  return (
    <BusinessProvider
      business={business}
    >
      <BusinessShell>
        {children}
      </BusinessShell>
    </BusinessProvider>
  );
}