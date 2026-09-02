"use client";

import {
  Buildings,
} from "@phosphor-icons/react";

import {
  useBusiness,
} from "@/components/business/BusinessContext";

export default function BusinessIdentity() {
  const {
    business,
  } = useBusiness();

  return (
    <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
      <Buildings
        size={12}
        weight="duotone"
      />

      {business?.name ??
        "Business workspace"}
    </div>
  );
}