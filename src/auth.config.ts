import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js configuration.
 *
 * This module is the ONLY auth configuration imported by the middleware.
 * It must never import Prisma, @/lib/prisma, PrismaAdapter, or any other
 * Node-only module — doing so pulls the Prisma client into the middleware
 * Edge bundle (exceeds the Vercel Hobby 1 MB Edge Function limit).
 *
 * The full Prisma-backed configuration lives in @/auth, which spreads this
 * base config and adds PrismaAdapter. The adapter is only exercised by the
 * /api/auth/* route handlers (Node runtime) during OAuth sign-in, never by
 * middleware route gating.
 *
 * Middleware uses this config as navigation/request gating (Layer 1);
 * server-side auth() and the service layer remain the authoritative
 * authorization boundaries (Layers 2–3).
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
