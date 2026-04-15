import type { PlanTier, SubscriptionStatus, UserRole } from "@/types/prisma";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      isBlocked: boolean;
      planTier: PlanTier;
      subStatus: SubscriptionStatus | null;
    };
  }

  interface User {
    role: UserRole;
    isBlocked: boolean;
    planTier: PlanTier;
    subStatus: SubscriptionStatus | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    isBlocked: boolean;
    planTier: PlanTier;
    subStatus: SubscriptionStatus | null;
  }
}
