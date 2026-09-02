import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAuth,
} from "@/lib/auth-utils";

import {
  prisma,
} from "@/lib/prisma";

import {
  getConsumerCostAnalytics,
} from "@/lib/cost-intelligence";

import {
  parseCostAnalyticsDateRange,
} from "@/lib/cost-intelligence/api-utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  try {
    const session =
      await requireAuth();

    const parsed =
      parseCostAnalyticsDateRange(
        request.nextUrl.searchParams,
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,

          error: {
            code:
              "INVALID_DATE_RANGE",

            message:
              parsed.error,
          },
        },
        {
          status: 400,
        },
      );
    }

    const analytics =
      await getConsumerCostAnalytics(
        prisma,
        session.user.id,
        parsed.range,
      );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error(
      "[cost-intelligence] Failed to load consumer analytics",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error: {
          code:
            "COST_ANALYTICS_ERROR",

          message:
            "Unable to load cost analytics",
        },
      },
      {
        status: 500,
      },
    );
  }
}