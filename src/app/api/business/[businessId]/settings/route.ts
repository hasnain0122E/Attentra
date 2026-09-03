/**
 * Business Settings API
 *
 * GET  — Return workspace settings (name, baseline model, role).
 *         Any member can read.
 * PUT  — Update baseline model (OWNER only).
 */

import { NextRequest, NextResponse } from "next/server";

import {
  requireBusinessMembership,
  requireBusinessRole,
} from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Supported provider names — only models belonging to these
 * providers are eligible as baseline candidates.
 */
const SUPPORTED_PROVIDERS = ["openai", "anthropic", "google"];

/**
 * GET /api/business/[businessId]/settings
 *
 * Returns workspace settings including:
 * - organization name
 * - current baseline model (if configured)
 * - authenticated user's role
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  try {
    const { membership } = await requireBusinessMembership(businessId);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        baselineModelId: true,
        baselineModel: {
          select: {
            id: true,
            modelIdentifier: true,
            displayName: true,
            provider: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: "Business not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: business.name,
        role: membership.role,
        baselineModel: business.baselineModel
          ? {
              id: business.baselineModel.id,
              modelIdentifier: business.baselineModel.modelIdentifier,
              displayName: business.baselineModel.displayName,
              providerName: business.baselineModel.provider.name,
            }
          : null,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized: not a member of this business") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("[business-settings] GET failed", err);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/business/[businessId]/settings
 *
 * Update workspace baseline model. OWNER only.
 *
 * Body: { baselineModelId: string | null }
 *
 * Setting baselineModelId to null clears the baseline.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  try {
    await requireBusinessRole(businessId, "OWNER");

    const body = (await request.json()) as {
      baselineModelId?: string | null;
    };

    /*
     * If a baselineModelId is provided (non-null), verify it exists,
     * is active, belongs to a supported provider, and has valid pricing.
     */
    if (body.baselineModelId) {
      const candidate = await prisma.model.findUnique({
        where: { id: body.baselineModelId },
        select: {
          id: true,
          active: true,
          inputPricePer1k: true,
          outputPricePer1k: true,
          provider: {
            select: { name: true, status: true },
          },
        },
      });

      if (!candidate) {
        return NextResponse.json(
          { success: false, error: "Model not found" },
          { status: 400 },
        );
      }

      if (!candidate.active) {
        return NextResponse.json(
          { success: false, error: "Model is not active" },
          { status: 400 },
        );
      }

      if (!SUPPORTED_PROVIDERS.includes(candidate.provider.name)) {
        return NextResponse.json(
          { success: false, error: "Model provider is not supported" },
          { status: 400 },
        );
      }

      if (candidate.provider.status !== "ACTIVE") {
        return NextResponse.json(
          { success: false, error: "Provider is not active" },
          { status: 400 },
        );
      }

      const inputPrice = Number(candidate.inputPricePer1k);
      const outputPrice = Number(candidate.outputPricePer1k);

      if (!Number.isFinite(inputPrice) || !Number.isFinite(outputPrice)) {
        return NextResponse.json(
          { success: false, error: "Model has invalid pricing" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      select: {
        id: true,
        baselineModelId: true,
      },
      data: {
        baselineModelId: body.baselineModelId ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { baselineModelId: updated.baselineModelId },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized: not a member of this business") {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }

      if (err.message.startsWith("Forbidden:")) {
        return NextResponse.json(
          { success: false, error: err.message },
          { status: 403 },
        );
      }
    }

    console.error("[business-settings] PUT failed", err);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
