import BusinessRequestsClient from "@/components/business/requests/BusinessRequestsClient";

export default function RequestsPage() {
  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Organization activity
          </div>

          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Requests.
          </h1>

          <p className="mt-3 max-w-[680px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
            Review requests generated across
            shared applications and API keys,
            including routing outcomes,
            fallback activity, model execution,
            latency, and request-level cost.
          </p>
        </div>
      </div>

      <BusinessRequestsClient />
    </div>
  );
}
