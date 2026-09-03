"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useBusiness } from "@/components/business/BusinessContext";

import type { BusinessRequestHistoryItem } from "@/lib/dashboard/business-request-queries";

import BusinessRequestFilters from "./BusinessRequestFilters";
import BusinessRequestTable from "./BusinessRequestTable";

export default function BusinessRequestsClient() {
  const { business } = useBusiness();

  const [requests, setRequests] = useState<BusinessRequestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [taskType, setTaskType] = useState("ALL");
  const [apiKey, setApiKey] = useState("ALL");

  // ── Fetch requests ────────────────────────────────
  const fetchRequests = useCallback(async () => {
    if (!business) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(
        `/api/business/${business.id}/requests`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );

      if (!res.ok) throw new Error("Failed to load");

      const json = (await res.json()) as {
        success: boolean;
        requests: BusinessRequestHistoryItem[];
      };

      if (!json.success) throw new Error("API error");

      setRequests(json.requests);
    } catch (err) {
      console.error("[business-requests] Failed to load", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  // ── Derived filter options ────────────────────────
  const taskTypes = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.taskType))).sort();
  }, [requests]);

  const apiKeys = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.apiKeyName))).sort();
  }, [requests]);

  // ── Filtered requests ─────────────────────────────
  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        request.prompt.toLowerCase().includes(normalizedSearch) ||
        request.id.toLowerCase().includes(normalizedSearch) ||
        request.requester.toLowerCase().includes(normalizedSearch) ||
        request.apiKeyName.toLowerCase().includes(normalizedSearch) ||
        request.routedModel.toLowerCase().includes(normalizedSearch) ||
        (request.executedModel ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus = status === "ALL" || request.status === status;
      const matchesTask = taskType === "ALL" || request.taskType === taskType;
      const matchesKey = apiKey === "ALL" || request.apiKeyName === apiKey;

      return matchesSearch && matchesStatus && matchesTask && matchesKey;
    });
  }, [search, status, taskType, apiKey, requests]);

  const hasFilters = search.length > 0 || status !== "ALL" || taskType !== "ALL" || apiKey !== "ALL";

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setTaskType("ALL");
    setApiKey("ALL");
  }

  // ── No business ───────────────────────────────────
  if (!business) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <div className="font-reservation text-[25px] text-[var(--color-foreground)]">
          No workspace available.
        </div>
        <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Create or join a business workspace to view requests.
        </p>
      </section>
    );
  }

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────
  if (error) {
    return (
      <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
            Requests could not be loaded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchRequests()}
          className="w-fit rounded-full border border-[var(--color-border)] px-4 py-2 text-[10px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-soft)]"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <BusinessRequestFilters
        search={search}
        status={status}
        taskType={taskType}
        member={apiKey}
        taskTypes={taskTypes}
        members={apiKeys}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onTaskTypeChange={setTaskType}
        onMemberChange={setApiKey}
      />

      <div className="flex items-center justify-between px-1">
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {filteredRequests.length}{" "}
          {filteredRequests.length === 1 ? "request" : "requests"}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-accent)] transition-opacity hover:opacity-70"
          >
            Clear filters
          </button>
        )}
      </div>

      <BusinessRequestTable requests={filteredRequests} />
    </div>
  );
}
