/**
 * Business Baseline Models API
 *
 * GET — Return the list of active models eligible for baseline configuration.
 *        Any member can read.
 *
 * Only returns models from supported providers (openai, anthropic, google)
 * that are active and have valid pricing.
 */

import { NextRequest, NextResponse } from "next/server";

import { requireBusinessMembership } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SUPPORTED_PROVIDERS = ["openai", "anthropic", "google"];

/**
 * GET /api/business/[businessId]/baseline-models
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  try {
    await requireBusinessMembership(businessId);

    const models = await prisma.model.findMany({
      where: {
        active: true,
        provider: {
          name: { in: SUPPORTED_PROVIDERS },
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        modelIdentifier: true,
        displayName: true,
        inputPricePer1k: true,
        outputPricePer1k: true,
        provider: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { provider: { name: "asc" } },
        { displayName: "asc" },
      ],
    });

    /*
     * Filter to models with valid (finite, non-negative) pricing.
     */
    const eligible = models.filter((m) => {
      const input = Number(m.inputPricePer1k);
      const output = Number(m.outputPricePer1k);
      return Number.isFinite(input) && Number.isFinite(output) && input >= 0 && output >= 0;
    });

    const data = eligible.map((m) => ({
      id: m.id,
      modelIdentifier: m.modelIdentifier,
      displayName: m.displayName,
      providerName: m.provider.name,
      label: `${m.displayName} (${m.provider.name})`,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized: not a member of this business") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("[baseline-models] GET failed", err);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
