import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-utils";
import { fetchOverviewData } from "@/lib/dashboard/overview-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();

    const data = await fetchOverviewData(session.user.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[dashboard/overview] Failed to load overview", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "OVERVIEW_ERROR",
          message: "Unable to load dashboard overview",
        },
      },
      { status: 500 },
    );
  }
}
