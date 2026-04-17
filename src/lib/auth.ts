import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { PlanTier, SubscriptionStatus, UserRole } from "@/types/prisma";

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
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            subscription: { include: { plan: true } },
          },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isBlocked: user.isBlocked,
          planTier: user.subscription?.plan.tier ?? "FREE",
          subStatus: user.subscription?.status ?? null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = (user as any).role;
        token.isBlocked = (user as any).isBlocked;
        // ADMINs always get ENTERPRISE-level access regardless of subscription
        token.planTier = (user as any).role === "ADMIN" ? "ENTERPRISE" : ((user as any).planTier ?? "FREE");
        token.subStatus = (user as any).subStatus ?? null;
      }

      // Refresh subscription data on session update — re-fetch from DB
      if (trigger === "update") {
        const userId = token.id as string;
        if (userId) {
          const fresh = await prisma.subscription.findUnique({
            where: { userId },
            include: { plan: true },
          });
          token.planTier = (token.role as string) === "ADMIN"
            ? "ENTERPRISE"
            : (fresh?.plan.tier ?? "FREE");
          token.subStatus = fresh?.status ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.isBlocked = token.isBlocked as boolean;
      session.user.planTier = (token.planTier as PlanTier) ?? "FREE";
      session.user.subStatus = (token.subStatus as SubscriptionStatus) ?? null;
      return session;
    },
    async signIn({ user, account }) {
      // Block sign-in for blocked users
      if (account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (dbUser?.isBlocked) return false;

        // Auto-assign FREE plan for new Google users
        if (dbUser && !dbUser.passwordHash) {
          const existing = await prisma.subscription.findUnique({
            where: { userId: dbUser.id },
          });
          if (!existing) {
            const freePlan = await prisma.plan.findUnique({
              where: { tier: "FREE" },
            });
            if (freePlan) {
              await prisma.subscription.create({
                data: { userId: dbUser.id, planId: freePlan.id, status: "ACTIVE" },
              });
            }
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
