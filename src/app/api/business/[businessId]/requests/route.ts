/**
 * Business Request History API
 *
 * GET /api/business/[businessId]/requests
 *
 * Returns all requests for the business, scoped by businessId.
 * Requires business membership (any role).
 */

import { NextRequest, NextResponse } from "next/server";

import { requireBusinessMembership } from "@/lib/auth-utils";
import { fetchBusinessRequests } from "@/lib/dashboard/business-request-queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  try {
    await requireBusinessMembership(businessId);

    const requests = await fetchBusinessRequests(businessId);

    return NextResponse.json({ success: true, requests });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized: not a member of this business") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("[business-requests] GET failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to load requests" },
      { status: 500 },
    );
  }
}
