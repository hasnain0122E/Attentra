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
  getConsumerBilling,
} from "@/lib/billing";

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
      await getConsumerBilling(
        prisma,
        session.user.id,
        range,
      );

    return NextResponse.json({
      success: true,
      data: billing,
    });
  } catch (error) {
    console.error(
      "[billing] Failed to load consumer billing",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error: {
          code:
            "BILLING_ERROR",

          message:
            "Unable to load billing data",
        },
      },
      {
        status: 500,
      },
    );
  }
}
