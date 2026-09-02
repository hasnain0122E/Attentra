"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import RequestDetailHeader from "@/components/dashboard/history/detail/RequestDetailHeader";
import RequestExecutionPath from "@/components/dashboard/history/detail/RequestExecutionPath";
import RequestMetadataGrid from "@/components/dashboard/history/detail/RequestMetadataGrid";
import RequestPromptResponse from "@/components/dashboard/history/detail/RequestPromptResponse";
import RequestRoutingOverview from "@/components/dashboard/history/detail/RequestRoutingOverview";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

export default function RequestDetailPage() {
  const params = useParams<{ requestId: string }>();
  const [request, setRequest] = useState<RequestHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/requests/${params.requestId}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (data?.request) {
          setRequest(data.request);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Loading request...
        </div>
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Request not found
        </div>
      </div>
    );
  }

  return (
    <div>
      <RequestDetailHeader request={request} />

      <div className="space-y-5">
        <RequestPromptResponse request={request} />

        <RequestRoutingOverview request={request} />

        <RequestMetadataGrid request={request} />

        <RequestExecutionPath request={request} />
      </div>
    </div>
  );
}
