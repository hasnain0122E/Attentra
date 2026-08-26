"use client";

import { GoogleLogo } from "@phosphor-icons/react";
import { signIn } from "next-auth/react";

export default function GoogleButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="
        flex h-12 w-full items-center justify-center gap-3
        rounded-xl
        border border-[var(--color-border)]
        bg-[var(--color-surface)]
        px-4
        text-sm font-medium
        text-[var(--color-foreground)]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-[var(--color-accent)]/30
        hover:bg-[var(--color-accent-soft)]
        hover:shadow-[var(--shadow-sm)]
        active:translate-y-0
      "
    >
      <GoogleLogo
        size={19}
        weight="regular"
        className="text-[var(--color-accent)]"
      />

      Continue with Google
    </button>
  );
}
