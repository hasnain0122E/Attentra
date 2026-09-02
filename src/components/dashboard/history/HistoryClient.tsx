"use client";

import { useEffect, useMemo, useState } from "react";

import HistoryFilters from "./HistoryFilters";
import HistoryTable from "./HistoryTable";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

export default function HistoryClient() {
  const [requests, setRequests] = useState<RequestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [taskType, setTaskType] = useState("ALL");

  useEffect(() => {
    fetch("/api/dashboard/requests")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setRequests(data.requests ?? []);
      })
      .catch(() => {
        setRequests([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const taskTypes = useMemo(() => {
    return Array.from(
      new Set(
        requests.map(
          (request) => request.taskType,
        ),
      ),
    ).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        request.prompt
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.id
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.routedModel
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.executedModel
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        status === "ALL" ||
        request.status === status;

      const matchesTask =
        taskType === "ALL" ||
        request.taskType === taskType;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesTask
      );
    });
  }, [requests, search, status, taskType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Loading requests...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HistoryFilters
        search={search}
        status={status}
        taskType={taskType}
        taskTypes={taskTypes}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onTaskTypeChange={setTaskType}
      />

      <div className="flex items-center justify-between px-1">
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {filteredRequests.length}{" "}
          {filteredRequests.length === 1
            ? "request"
            : "requests"}
        </div>

        {(search ||
          status !== "ALL" ||
          taskType !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("ALL");
              setTaskType("ALL");
            }}
            className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-accent)] transition-opacity hover:opacity-70"
          >
            Clear filters
          </button>
        )}
      </div>

      <HistoryTable
        requests={filteredRequests}
      />
    </div>
  );
}