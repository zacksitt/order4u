import type { NextAuthConfig, Session } from "next-auth";

/** Edge-safe Auth.js config. Middleware must not import Prisma. */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id!;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }
      if (trigger === "update" && session && "mustChangePassword" in session) {
        token.mustChangePassword = Boolean(session.mustChangePassword);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      session.tenantId = token.tenantId as string;
      session.role = token.role as Session["role"];
      session.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
  },
} satisfies NextAuthConfig;
