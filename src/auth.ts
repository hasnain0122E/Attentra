import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import { authConfig } from "@/auth.config";

/**
 * Full (Node runtime) Auth.js configuration.
 *
 * Spreads the Edge-safe base config from @/auth.config and adds the
 * Prisma-backed adapter. This module must NOT be imported by middleware —
 * PrismaAdapter/@prisma/client would enter the Edge bundle.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(prisma),

  events: {
    async signIn({ user }) {
      // Log successful sign-ins for server-side observability
      console.log(`[auth] sign-in: userId=${user.id} email=${user.email}`);
    },
  },
});
