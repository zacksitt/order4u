import type { MembershipRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/server/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user?.isActive) return null;
        if (!compareSync(password, user.passwordHash)) return null;

        const membership = await prisma.tenantMembership.findFirst({
          where: { userId: user.id, role: { in: ["agent", "cargo"] } },
          orderBy: { role: "asc" },
        });
        if (!membership) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          tenantId: membership.tenantId,
          role: membership.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id!;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      session.tenantId = token.tenantId as string;
      session.role = token.role as MembershipRole;
      return session;
    },
  },
});
