import type { MembershipRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
    tenantId: string;
    role: MembershipRole;
    mustChangePassword?: boolean;
  }

  interface User {
    id: string;
    tenantId: string;
    role: MembershipRole;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    tenantId: string;
    role: MembershipRole;
    mustChangePassword?: boolean;
  }
}
