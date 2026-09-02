/**
 * Attentra — Consumer Request Detail API
 *
 * Phase 12.5 — Real Consumer History
 *
 * GET /api/dashboard/requests/[requestId]
 *
 * Returns a single request owned by the authenticated session user,
 * mapped to the existing history UI contract.
 */

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchUserRequest } from "@/lib/dashboard/request-queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const item = await fetchUserRequest(session.user.id, params.requestId);

    if (!item) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: item });
  } catch {
    return NextResponse.json(
      { error: "Failed to load request" },
      { status: 500 }
    );
  }
}
