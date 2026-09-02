import { NextRequest, NextResponse } from "next/server";

import { requireBusinessRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { revokeBusinessApiKey } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { businessId: string; apiKeyId: string };
}

/**
 * DELETE /api/business/[businessId]/api-keys/[apiKeyId]
 *
 * Revoke a business API key. OWNER role required.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { businessId, apiKeyId } = context.params;

    if (!businessId?.trim() || !apiKeyId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_PARAMS", message: "businessId and apiKeyId are required" },
        },
        { status: 400 },
      );
    }

    // OWNER role required for revocation
    await requireBusinessRole(businessId, "OWNER");

    const revoked = await revokeBusinessApiKey(prisma, apiKeyId, businessId);

    if (!revoked) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "API key not found or does not belong to this business" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
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

    console.error("[api-keys] DELETE failed", error);
    return NextResponse.json(
      { success: false, error: { code: "REVOKE_FAILED", message: "Unable to revoke API key" } },
      { status: 500 },
    );
  }
}
