/**
 * Attentra — Consumer Request History API
 *
 * Phase 12.5 — Real Consumer History
 *
 * GET /api/dashboard/requests
 *
 * Returns all requests owned by the authenticated session user,
 * mapped to the existing history UI contract.
 */

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchUserRequests } from "@/lib/dashboard/request-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const requests = await fetchUserRequests(session.user.id);
    return NextResponse.json({ requests });
  } catch {
    return NextResponse.json(
      { error: "Failed to load requests" },
      { status: 500 }
    );
  }
}
