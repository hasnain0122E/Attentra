"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  description: string;
  bottomText: string;
  bottomLinkText: string;
  bottomLinkHref: string;
}

export default function AuthShell({
  children,
  title,
  description,
  bottomText,
  bottomLinkText,
  bottomLinkHref,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
      {/* =====================================================
          BRAND ATMOSPHERE
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Main accent glow */}
        <div className="absolute left-1/2 top-[-20rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-45 blur-[150px]" />

        {/* Secondary glow */}
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[var(--color-accent-soft)] opacity-20 blur-[150px]" />

        {/* Subtle left glow */}
        <div className="absolute bottom-[-16rem] left-[-16rem] h-[30rem] w-[30rem] rounded-full bg-[var(--color-accent-soft)] opacity-10 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-[560px]">
          {/* =================================================
              BACK TO WEBSITE
              ================================================= */}

          <div className="mb-7">
            <Link
              href="/"
              className="group mx-auto flex w-fit items-center gap-2 text-xs font-medium text-[var(--color-foreground-muted)] transition-colors duration-200 hover:text-[var(--color-accent)]"
            >
              <ArrowLeft
                size={14}
                weight="regular"
                className="transition-transform duration-200 group-hover:-translate-x-0.5"
              />

              Back to Attentra
            </Link>
          </div>

          {/* =================================================
              ACTUAL ATTENTRA LOGO
              ================================================= */}

          <div className="mb-8 flex justify-center">
            <Link
              href="/"
              aria-label="Attentra home"
              className="block transition-transform duration-200 hover:scale-[1.01]"
            >
              <Image
                src="/Attentra.png"
                alt="Attentra"
                width={190}
                height={60}
                priority
                className="h-auto w-[165px] object-contain sm:w-[180px]"
              />
            </Link>
          </div>

          {/* =================================================
              AUTH CARD
              ================================================= */}

          <section className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)] sm:p-9">
            {/* Header */}

            <div className="text-center">
              <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--color-foreground)] sm:text-4xl">
                {title}
              </h1>

              <p className="mx-auto mt-4 max-w-[430px] text-sm leading-6 text-[var(--color-foreground-secondary)] sm:text-base">
                {description}
              </p>
            </div>

            {/* Form */}

            <div className="mt-8">{children}</div>
          </section>

          {/* =================================================
              LOGIN / SIGNUP SWITCH
              ================================================= */}

          <p className="mt-6 text-center text-xs text-[var(--color-foreground-muted)]">
            {bottomText}{" "}
            <Link
              href={bottomLinkHref}
              className="font-semibold text-[var(--color-accent)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline"
            >
              {bottomLinkText}
            </Link>
          </p>

          {/* =================================================
              SYSTEM LABEL
              ================================================= */}

          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]" />

            <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--color-foreground-muted)]">
              ATTENTRA · INTELLIGENT MODEL ROUTING
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}