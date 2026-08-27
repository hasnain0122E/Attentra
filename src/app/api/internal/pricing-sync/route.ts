/**
 * Attentra — Internal Pricing Sync API Route
 *
 * POST /api/internal/pricing-sync
 *
 * Triggered by Vercel Cron Jobs (every 10 hours) or manual invocation.
 * Secured by CRON_SECRET environment variable.
 *
 * Architecture: Deployment-compatible scheduler.
 * Vercel cron → POST this route with Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAllPricing } from "@/lib/pricing/sync-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const results = await syncAllPricing(prisma, "cron");

    const totalModelsSynced = results.reduce((sum, r) => sum + r.modelsSynced, 0);
    const totalPricesUpdated = results.reduce((sum, r) => sum + r.pricesUpdated, 0);
    const hasFailures = results.some((r) => r.status === "FAILED");

    return NextResponse.json({
      success: !hasFailures,
      providers: results.map((r) => ({
        provider: r.providerName,
        status: r.status,
        modelsSynced: r.modelsSynced,
        pricesUpdated: r.pricesUpdated,
        error: r.error ?? null,
      })),
      summary: {
        totalModelsSynced,
        totalPricesUpdated,
        providersProcessed: results.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[pricing-sync-cron] Failed:", message);

    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
