// Local type aliases for Prisma enums
// These match the enum values defined in prisma/schema.prisma

export type UserRole = "USER" | "ADMIN";

export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "INCOMPLETE";

export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export type CalculationType = "RURAL_TAX" | "RH_CLT" | "RESCISAO";

export type BrazilianState =
  | "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA"
  | "MT" | "MS" | "MG" | "PA" | "PB" | "PR" | "PE" | "PI" | "RJ" | "RN"
  | "RS" | "RO" | "RR" | "SC" | "SP" | "SE" | "TO";
