/**
 * Attentra — Consumer Personal API Key Revoke
 *
 * Phase 12.13.1 — Personal API Key Foundation
 *
 * DELETE /api/dashboard/api-keys/[apiKeyId] — revoke a personal key
 *
 * Requires an authenticated session.
 * The key must belong to session.user.id — a user can only
 * revoke their own personal keys.
 */

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { revokePersonalApiKey } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { apiKeyId: string };
}

/**
 * DELETE /api/dashboard/api-keys/[apiKeyId]
 *
 * Revoke a personal API key owned by the authenticated user.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const apiKeyId = context.params.apiKeyId;

    if (!apiKeyId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_KEY_ID", message: "apiKeyId is required" },
        },
        { status: 400 },
      );
    }

    const revoked = await revokePersonalApiKey(prisma, apiKeyId, userId);

    if (!revoked) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "API key not found or does not belong to this user",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[dashboard/api-keys] DELETE failed", error);

    return NextResponse.json(
      {
        success: false,
        error: { code: "REVOKE_FAILED", message: "Unable to revoke API key" },
      },
      { status: 500 },
    );
  }
}
