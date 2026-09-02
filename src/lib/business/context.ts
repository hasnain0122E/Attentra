import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export interface ActiveBusiness {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
}

export async function getActiveBusiness(): Promise<
  ActiveBusiness | null
> {
  const session = await requireAuth();

  const membership =
    await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        role: true,

        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  if (!membership) {
    return null;
  }

  return {
    id: membership.business.id,
    name: membership.business.name,
    role: membership.role,
  };
}