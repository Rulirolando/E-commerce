import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

type AppRole = "USER" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface User {
    role?: AppRole;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & NonNullable<DefaultSession["user"]>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
