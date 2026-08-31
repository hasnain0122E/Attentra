import PlaygroundClient from "@/components/dashboard/playground/PlaygroundClient";

export default function PlaygroundPage() {
  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Playground
          </div>

          <h1 className="mt-3 font-reservation text-[clamp(2.2rem,4vw,4rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[var(--color-foreground)]">
            Route a request.
          </h1>

          <p className="mt-4 max-w-[680px] text-[13px] leading-6 text-[var(--color-foreground-secondary)]">
            Send a prompt through Attentra and inspect how the routing
            engine analyzes the task, selects a model, executes the
            request, and handles fallback.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />

          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Routing engine ready
          </span>
        </div>
      </section>

      <PlaygroundClient />
    </div>
  );
}