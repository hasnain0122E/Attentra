/**
 * Business Members API
 *
 * GET /api/business/[businessId]/members
 *
 * Returns real membership data for the business.
 * Requires business membership (any role).
 */

import { NextRequest, NextResponse } from "next/server";

import { requireBusinessMembership } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  try {
    await requireBusinessMembership(businessId);

    const memberships = await prisma.membership.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const data = memberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name ?? m.user.email ?? "Unknown",
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized: not a member of this business") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("[business-members] GET failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to load members" },
      { status: 500 },
    );
  }
}
