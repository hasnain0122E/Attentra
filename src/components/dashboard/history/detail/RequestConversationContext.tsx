"use client";

import { useMemo, useState } from "react";

import {
  interpretStoredPrompt,
  type ContextMessage,
} from "@/lib/dashboard/prompt-context";

/** Messages longer than this are collapsed by default. */
export const COLLAPSE_MESSAGE_CHARS = 600;
/** Plain-text prompts longer than this show only their end by default. */
export const COLLAPSE_TEXT_CHARS = 1_200;

const ROLE_LABEL: Record<ContextMessage["role"], string> = {
  system: "System",
  developer: "Developer",
  user: "User",
  assistant: "Assistant",
  tool: "Tool",
  unknown: "Unknown role",
};

/**
 * Conversation context sent with a request.
 *
 * All content is rendered as React text (escaped) — never as HTML.
 */
export default function RequestConversationContext({ prompt }: { prompt: string }) {
  const context = useMemo(() => interpretStoredPrompt(prompt), [prompt]);
  const [showAll, setShowAll] = useState(false);

  if (context.kind === "empty") {
    return (
      <Shell title="Conversation context">
        <p className="text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
          No prompt text is stored for this request.
        </p>
      </Shell>
    );
  }

  if (context.kind === "text") {
    const long = context.text.length > COLLAPSE_TEXT_CHARS;
    const visible =
      long && !showAll
        ? `…${context.text.slice(context.text.length - COLLAPSE_TEXT_CHARS)}`
        : context.text;

    return (
      <Shell
        title="Conversation context"
        meta={`${context.text.length.toLocaleString("en")} characters`}
      >
        <p className="text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Stored as text: the user messages sent with this request, combined in order. System and
          assistant messages and individual message boundaries are not stored, so the newest user
          message is at the end.
        </p>

        <div className="mt-4 max-h-[480px] overflow-y-auto rounded-2xl bg-[var(--color-background)] p-4 sm:p-5">
          <p className="whitespace-pre-wrap break-words text-[11px] leading-6 text-[var(--color-foreground)]">
            {visible}
          </p>
        </div>

        {long && (
          <ToggleButton onClick={() => setShowAll((v) => !v)} expanded={showAll}>
            {showAll ? "Show only the end" : "Show full stored text"}
          </ToggleButton>
        )}
      </Shell>
    );
  }

  const { messages, latestUserIndex } = context;
  const visibleIndexes = showAll
    ? messages.map((_, i) => i)
    : latestUserIndex >= 0
      ? [latestUserIndex]
      : [messages.length - 1];

  return (
    <Shell
      title="Conversation context"
      meta={`${context.messageCount} message${context.messageCount === 1 ? "" : "s"} in request`}
    >
      {latestUserIndex < 0 && (
        <p className="mb-3 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          This request contains no user message.
        </p>
      )}

      <ol className="space-y-3" aria-label="Messages in original order">
        {visibleIndexes.map((index) => (
          <MessageItem
            key={index}
            index={index}
            message={messages[index]}
            latest={index === latestUserIndex}
          />
        ))}
      </ol>

      {messages.length > 1 && (
        <ToggleButton onClick={() => setShowAll((v) => !v)} expanded={showAll}>
          {showAll
            ? "Show latest user message only"
            : `Show all ${messages.length} messages`}
        </ToggleButton>
      )}
    </Shell>
  );
}

function MessageItem({
  index,
  message,
  latest,
}: {
  index: number;
  message: ContextMessage;
  latest: boolean;
}) {
  const long = message.content.length > COLLAPSE_MESSAGE_CHARS;
  const [expanded, setExpanded] = useState(!long);
  const text = expanded
    ? message.content
    : `${message.content.slice(0, COLLAPSE_MESSAGE_CHARS).trimEnd()}…`;

  return (
    <li
      className={[
        "rounded-2xl border p-4",
        latest
          ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)]/40"
          : "border-[var(--color-border)] bg-[var(--color-background)]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[7px] text-[var(--color-foreground-muted)]">#{index + 1}</span>
        <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
          {ROLE_LABEL[message.role]}
        </span>
        {latest && (
          <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-white">
            Latest user message
          </span>
        )}
      </div>

      <p className="mt-2.5 whitespace-pre-wrap break-words text-[11px] leading-6 text-[var(--color-foreground)]">
        {text}
      </p>

      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-accent)] hover:underline"
        >
          {expanded ? "Collapse" : `Show full message (${message.content.length.toLocaleString("en")} chars)`}
        </button>
      )}
    </li>
  );
}

function Shell({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
          {title}
        </div>
        {meta && (
          <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
            {meta}
          </div>
        )}
      </div>
      {children}
    </article>
  );
}

function ToggleButton({
  onClick,
  expanded,
  children,
}: {
  onClick: () => void;
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="mt-4 inline-flex h-8 items-center rounded-lg border border-[var(--color-border)] px-3 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]"
    >
      {children}
    </button>
  );
}
