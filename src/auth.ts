import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";

import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/input-rules";
import { prisma } from "@/server/db";

const credentialsSchema = loginSchema;

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
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
          where: { email },
        });
        if (!user?.isActive) return null;
        if (!compareSync(password, user.passwordHash)) return null;

        const membership = await prisma.tenantMembership.findFirst({
          where: { userId: user.id, role: { in: ["agent", "cargo", "customer"] } },
          orderBy: { role: "asc" },
        });
        if (!membership) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          tenantId: membership.tenantId,
          role: membership.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
