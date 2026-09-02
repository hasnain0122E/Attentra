import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireBusinessMembership,
} from "@/lib/auth-utils";

import {
  prisma,
} from "@/lib/prisma";

import {
  getBusinessCostAnalytics,
} from "@/lib/cost-intelligence";

import {
  parseCostAnalyticsDateRange,
} from "@/lib/cost-intelligence/api-utils";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: {
    businessId: string;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const businessId =
      context.params.businessId;

    if (!businessId?.trim()) {
      return NextResponse.json(
        {
          success: false,

          error: {
            code:
              "INVALID_BUSINESS_ID",

            message:
              "Business ID is required",
          },
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Critical authorization boundary.
     *
     * Never trust the businessId from the URL alone.
     * Verify that the authenticated user is actually
     * a member of this organization.
     */
    await requireBusinessMembership(
      businessId,
    );

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
      await getBusinessCostAnalytics(
        prisma,
        businessId,
        parsed.range,
      );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    /**
     * requireBusinessMembership currently throws a
     * normal Error for non-members.
     *
     * Keep the authorization response explicit instead
     * of exposing the underlying error.
     */
    if (
      error instanceof Error &&
      error.message.includes(
        "Unauthorized: not a member of this business",
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error: {
            code:
              "BUSINESS_ACCESS_DENIED",

            message:
              "You do not have access to this business",
          },
        },
        {
          status: 403,
        },
      );
    }

    console.error(
      "[cost-intelligence] Failed to load business analytics",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error: {
          code:
            "COST_ANALYTICS_ERROR",

          message:
            "Unable to load business cost analytics",
        },
      },
      {
        status: 500,
      },
    );
  }
}