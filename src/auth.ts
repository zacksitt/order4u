import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { prisma } from "@/server/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
});
