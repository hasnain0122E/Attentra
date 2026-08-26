import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Retrieve the current authenticated session (server-side).
 * Returns null if no session exists.
 */
export async function getSession() {
  return auth();
}

/**
 * Require an authenticated session.
 * Redirects to /login if unauthenticated.
 * Returns the session with a guaranteed user.id.
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session as typeof session & { user: { id: string } };
}

/**
 * Require authenticated membership in a specific business.
 * Redirects to /login if unauthenticated.
 * Throws if the user is not a member of the specified business.
 *
 * Never trust a client-provided businessId — always verify membership
 * from the database using the trusted session userId.
 */
export async function requireBusinessMembership(businessId: string) {
  const session = await requireAuth();
  const userId = session.user.id;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_businessId: {
        userId,
        businessId,
      },
    },
  });

  if (!membership) {
    throw new Error("Unauthorized: not a member of this business");
  }

  return { session, membership };
}

/**
 * Require that the authenticated user holds a specific membership role
 * within the specified business.
 */
export async function requireBusinessRole(
  businessId: string,
  role: "OWNER" | "MEMBER"
) {
  const { session, membership } = await requireBusinessMembership(businessId);

  if (membership.role !== role) {
    throw new Error(
      `Forbidden: requires ${role} role in this business`
    );
  }

  return { session, membership };
}
