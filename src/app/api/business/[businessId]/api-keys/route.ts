import { NextRequest, NextResponse } from "next/server";

import {
  requireBusinessMembership,
  requireBusinessRole,
} from "@/lib/auth-utils";

import { prisma } from "@/lib/prisma";

import {
  createBusinessApiKey,
  listBusinessApiKeys,
} from "@/lib/api-keys";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { businessId: string };
}

// ─────────────────────────────────────────────────────
// GET — List API keys (members allowed)
// ─────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const businessId = context.params.businessId;

    if (!businessId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_BUSINESS_ID", message: "Business ID is required" },
        },
        { status: 400 },
      );
    }

    // Membership check — any role can list
    await requireBusinessMembership(businessId);

    const keys = await listBusinessApiKeys(prisma, businessId);

    return NextResponse.json({
      success: true,
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, error: { code: "ACCESS_DENIED", message: "Not a member of this business" } },
        { status: 403 },
      );
    }

    console.error("[api-keys] GET failed", error);
    return NextResponse.json(
      { success: false, error: { code: "LIST_FAILED", message: "Unable to list API keys" } },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────
// POST — Create API key (OWNER only)
// ─────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const businessId = context.params.businessId;

    if (!businessId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_BUSINESS_ID", message: "Business ID is required" },
        },
        { status: 400 },
      );
    }

    // OWNER role required for creation
    await requireBusinessRole(businessId, "OWNER");

    // ── Parse body ──────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Request body must be valid JSON" } },
        { status: 400 },
      );
    }

    const rawName = (body as Record<string, unknown>)?.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_NAME", message: "API key name is required" } },
        { status: 400 },
      );
    }

    // ── Optional expiry ─────────────────────────────
    let expiresAt: Date | null = null;
    const rawExpires = (body as Record<string, unknown>)?.expiresAt;

    if (typeof rawExpires === "string" && rawExpires.trim()) {
      const parsed = new Date(rawExpires);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_EXPIRY", message: "expiresAt must be a valid ISO date" } },
          { status: 400 },
        );
      }
      expiresAt = parsed;
    }

    // ── Create ──────────────────────────────────────
    const created = await createBusinessApiKey(prisma, {
      businessId,
      name,
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          name: created.name,
          rawKey: created.rawKey,
          keyPrefix: created.keyPrefix,
          expiresAt: created.expiresAt?.toISOString() ?? null,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) {
        return NextResponse.json(
          { success: false, error: { code: "ACCESS_DENIED", message: "OWNER role required" } },
          { status: 403 },
        );
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "OWNER role required" } },
          { status: 403 },
        );
      }
    }

    console.error("[api-keys] POST failed", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Unable to create API key" } },
      { status: 500 },
    );
  }
}
