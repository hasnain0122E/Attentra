"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  businessRequests,
} from "@/lib/business/request-data";

import BusinessRequestFilters from "./BusinessRequestFilters";
import BusinessRequestTable from "./BusinessRequestTable";

export default function BusinessRequestsClient() {
  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [taskType, setTaskType] =
    useState("ALL");

  const [member, setMember] =
    useState("ALL");

  const taskTypes = useMemo(() => {
    return Array.from(
      new Set(
        businessRequests.map(
          (request) =>
            request.taskType,
        ),
      ),
    ).sort();
  }, []);

  const members = useMemo(() => {
    return Array.from(
      new Set(
        businessRequests.map(
          (request) =>
            request.member.name,
        ),
      ),
    ).sort();
  }, []);

  const filteredRequests =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return businessRequests.filter(
        (request) => {
          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            request.prompt
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            request.id
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            request.member.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            request.apiKey.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            request.routedModel
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            request.executedModel
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesStatus =
            status === "ALL" ||
            request.status === status;

          const matchesTask =
            taskType === "ALL" ||
            request.taskType ===
              taskType;

          const matchesMember =
            member === "ALL" ||
            request.member.name ===
              member;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesTask &&
            matchesMember
          );
        },
      );
    }, [
      search,
      status,
      taskType,
      member,
    ]);

  const hasFilters =
    search.length > 0 ||
    status !== "ALL" ||
    taskType !== "ALL" ||
    member !== "ALL";

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setTaskType("ALL");
    setMember("ALL");
  }

  return (
    <div className="space-y-4">
      <BusinessRequestFilters
        search={search}
        status={status}
        taskType={taskType}
        member={member}
        taskTypes={taskTypes}
        members={members}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onTaskTypeChange={
          setTaskType
        }
        onMemberChange={setMember}
      />

      <div className="flex items-center justify-between px-1">
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {filteredRequests.length}{" "}
          {filteredRequests.length ===
          1
            ? "request"
            : "requests"}
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

      <BusinessRequestTable
        requests={filteredRequests}
      />
    </div>
  );
}