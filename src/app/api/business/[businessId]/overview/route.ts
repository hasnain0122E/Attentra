import { NextRequest, NextResponse } from "next/server";

import { requireBusinessMembership } from "@/lib/auth-utils";
import { fetchBusinessOverviewData } from "@/lib/dashboard/business-overview-queries";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { businessId: string };
}

/**
 * GET /api/business/[businessId]/overview
 *
 * Returns workspace-scoped overview data: metrics, model usage,
 * recent requests, routing health, and API key stats.
 * Any business member may access this endpoint.
 */
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

    // Membership check — any role can view overview
    await requireBusinessMembership(businessId);

    const data = await fetchBusinessOverviewData(businessId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, error: { code: "ACCESS_DENIED", message: "Not a member of this business" } },
        { status: 403 },
      );
    }

    console.error("[business-overview] GET failed", error);
    return NextResponse.json(
      { success: false, error: { code: "OVERVIEW_FAILED", message: "Unable to load business overview" } },
      { status: 500 },
    );
  }
}
