import {
  Check,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

import { rolePermissions } from "@/lib/business/member-data";

export default function RolePermissionsPanel() {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[var(--color-foreground)] p-5 text-white sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute -right-[22%] -top-[22%] h-[300px] w-[300px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(217,119,69,0.18) 0%, rgba(217,119,69,0.05) 42%, rgba(217,119,69,0) 72%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/40">
              Access control
            </div>

            <h2 className="mt-3 max-w-[330px] font-reservation text-[29px] leading-[0.96] tracking-[-0.03em]">
              Clear roles for every workspace responsibility.
            </h2>
          </div>

          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--color-accent)] sm:flex">
            <ShieldCheck
              size={17}
              weight="duotone"
            />
          </div>
        </div>

        <div className="mt-7 space-y-3">
          {rolePermissions.map(
            (role) => (
              <div
                key={role.role}
                className="rounded-[17px] border border-white/[0.08] bg-white/[0.035] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={[
                        "font-mono text-[8px] uppercase tracking-[0.1em]",
                        role.role ===
                          "OWNER" ||
                        role.role ===
                          "ADMIN"
                          ? "text-[var(--color-accent)]"
                          : "text-white/60",
                      ].join(" ")}
                    >
                      {role.role}
                    </div>

                    <p className="mt-2 text-[9px] leading-5 text-white/45">
                      {
                        role.description
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {role.permissions.map(
                    (permission) => (
                      <div
                        key={
                          permission
                        }
                        className="flex items-start gap-2"
                      >
                        <Check
                          size={9}
                          weight="bold"
                          className="mt-0.5 shrink-0 text-[var(--color-accent)]"
                        />

                        <span className="text-[8px] leading-4 text-white/50">
                          {
                            permission
                          }
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}