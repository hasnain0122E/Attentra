import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/business
 *
 * Create a new Business workspace with the authenticated
 * user as the OWNER.
 *
 * Input:  { name: string }
 * Output: { success: true, data: { id, name, role } }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // ── Parse body ──────────────────────────────────
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_BODY",
            message: "Request body must be valid JSON",
          },
        },
        { status: 400 },
      );
    }

    const name =
      typeof (body as Record<string, unknown>)?.name === "string"
        ? ((body as Record<string, string>).name).trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_NAME",
            message: "Business name is required",
          },
        },
        { status: 400 },
      );
    }

    // ── Check if user already has a business ────────
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
    });

    if (existingMembership) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BUSINESS_EXISTS",
            message: "User already belongs to a business workspace",
          },
        },
        { status: 409 },
      );
    }

    // ── Create Business + Membership in a transaction ─
    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name },
      });

      const membership = await tx.membership.create({
        data: {
          userId: session.user.id,
          businessId: business.id,
          role: "OWNER",
        },
      });

      return { business, membership };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.business.id,
          name: result.business.name,
          role: result.membership.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/business] Failed to create business", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "Unable to create business workspace",
        },
      },
      { status: 500 },
    );
  }
}
