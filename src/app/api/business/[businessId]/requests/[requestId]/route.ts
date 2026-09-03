/**
 * Business Request Detail API
 *
 * GET /api/business/[businessId]/requests/[requestId]
 *
 * Returns a single request scoped by BOTH requestId and businessId.
 * Requires business membership (any role).
 */

import { NextRequest, NextResponse } from "next/server";

import { requireBusinessMembership } from "@/lib/auth-utils";
import { fetchBusinessRequest } from "@/lib/dashboard/business-request-queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; requestId: string }> },
) {
  const { businessId, requestId } = await params;

  try {
    await requireBusinessMembership(businessId);

    const item = await fetchBusinessRequest(businessId, requestId);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, request: item });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized: not a member of this business") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("[business-requests] detail GET failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to load request" },
      { status: 500 },
    );
  }
}
