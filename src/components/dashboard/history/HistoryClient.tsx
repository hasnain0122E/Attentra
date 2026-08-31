"use client";

import { useMemo, useState } from "react";

import HistoryFilters from "./HistoryFilters";
import HistoryTable from "./HistoryTable";

import { requestHistory } from "@/lib/dashboard/history-data";

export default function HistoryClient() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [taskType, setTaskType] = useState("ALL");

  const taskTypes = useMemo(() => {
    return Array.from(
      new Set(
        requestHistory.map(
          (request) => request.taskType,
        ),
      ),
    ).sort();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return requestHistory.filter((request) => {
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
  }, [search, status, taskType]);

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