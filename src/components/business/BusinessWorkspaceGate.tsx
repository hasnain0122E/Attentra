"use client";

import { useBusiness } from "@/components/business/BusinessContext";
import CreateBusinessForm from "@/components/business/CreateBusinessForm";
import BusinessOverviewClient from "@/components/business/overview/BusinessOverviewClient";

/**
 * BusinessWorkspaceGate
 *
 * Checks whether the authenticated user has a business workspace.
 * If not, renders the creation form. Otherwise, renders the
 * real business overview.
 */
export default function BusinessWorkspaceGate() {
  const { business } = useBusiness();

  if (!business) {
    return <CreateBusinessForm />;
  }

  return <BusinessOverviewClient />;
}
