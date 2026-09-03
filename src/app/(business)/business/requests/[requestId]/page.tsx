"use client";

import { useCallback, useEffect, useState } from "react";

import { useParams } from "next/navigation";

import BusinessRequestDetailHeader from "@/components/business/requests/detail/BusinessRequestDetailHeader";
import BusinessRequestExecution from "@/components/business/requests/detail/BusinessRequestExecution";
import BusinessRequestPromptResponse from "@/components/business/requests/detail/BusinessRequestPromptResponse";
import BusinessRequestRouting from "@/components/business/requests/detail/BusinessRequestRouting";
import BusinessRequestTelemetry from "@/components/business/requests/detail/BusinessRequestTelemetry";

import { useBusiness } from "@/components/business/BusinessContext";

import type { BusinessRequestHistoryItem } from "@/lib/dashboard/business-request-queries";

export default function BusinessRequestDetailPage() {
  const { business } = useBusiness();
  const params = useParams<{ requestId: string }>();
  const requestId = params.requestId;

  const [request, setRequest] = useState<BusinessRequestHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRequest = useCallback(async () => {
    if (!business || !requestId) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(
        `/api/business/${business.id}/requests/${requestId}`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );

      if (res.status === 404) {
        setRequest(null);
        return;
      }

      if (!res.ok) throw new Error("Failed to load");

      const json = (await res.json()) as {
        success: boolean;
        request: BusinessRequestHistoryItem;
      };

      if (!json.success) throw new Error("API error");

      setRequest(json.request);
    } catch (err) {
      console.error("[business-request-detail] Failed to load", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [business, requestId]);

  useEffect(() => {
    void fetchRequest();
  }, [fetchRequest]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <div className="font-reservation text-[25px] text-[var(--color-foreground)]">
          Request not found.
        </div>
        <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          This organization request could not be loaded or does not exist in this workspace.
        </p>
      </section>
    );
  }

  return (
    <div>
      <BusinessRequestDetailHeader request={request} />

      <div className="space-y-5">
        <BusinessRequestPromptResponse request={request} />

        <BusinessRequestRouting request={request} />

        <BusinessRequestTelemetry request={request} />

        <BusinessRequestExecution request={request} />
      </div>
    </div>
  );
}
