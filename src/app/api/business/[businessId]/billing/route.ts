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
  getBusinessBilling,
} from "@/lib/billing";

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

    /**
     * Default to the current calendar month
     * when no date range is provided.
     */
    const range = parsed.range;

    if (!range.from || !range.to) {
      const now = new Date();
      const from = range.from ?? new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const to = range.to ?? new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      range.from = from;
      range.to = to;
    }

    const billing =
      await getBusinessBilling(
        prisma,
        businessId,
        range,
      );

    return NextResponse.json({
      success: true,
      data: billing,
    });
  } catch (error) {
    /**
     * requireBusinessMembership throws for non-members.
     * Return 403 instead of exposing the underlying error.
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
      "[billing] Failed to load business billing",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error: {
          code:
            "BILLING_ERROR",

          message:
            "Unable to load business billing data",
        },
      },
      {
        status: 500,
      },
    );
  }
}
