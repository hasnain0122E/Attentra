/**
 * Attentra — Consumer Personal API Key Routes
 *
 * Phase 12.13.1 — Personal API Key Foundation
 *
 * GET  /api/dashboard/api-keys — list current user's personal keys
 * POST /api/dashboard/api-keys — create a new personal key
 *
 * Both require an authenticated session.
 * Keys are scoped to session.user.id — a user can only
 * see and create their own personal keys.
 */

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import {
  createPersonalApiKey,
  listPersonalApiKeys,
} from "@/lib/api-keys";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────
// GET — List personal API keys
// ─────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const keys = await listPersonalApiKeys(prisma, userId);

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
    console.error("[dashboard/api-keys] GET failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_FAILED",
          message: "Unable to load API keys",
        },
      },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────
// POST — Create a personal API key
// ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid JSON body" },
        },
        { status: 400 },
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_NAME", message: "Key name is required" },
        },
        { status: 400 },
      );
    }

    let expiresAt: Date | null = null;

    if (body.expiresAt && typeof body.expiresAt === "string") {
      const parsed = new Date(body.expiresAt);

      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_EXPIRY", message: "Invalid expiry date" },
          },
          { status: 400 },
        );
      }

      expiresAt = parsed;
    }

    const result = await createPersonalApiKey(prisma, {
      userId,
      name,
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          rawKey: result.rawKey,
          keyPrefix: result.keyPrefix,
          expiresAt: result.expiresAt?.toISOString() ?? null,
          createdAt: result.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create API key";

    if (
      message.includes("name is required") ||
      message.includes("expiresAt")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message },
        },
        { status: 400 },
      );
    }

    console.error("[dashboard/api-keys] POST failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "Unable to create API key",
        },
      },
      { status: 500 },
    );
  }
}
