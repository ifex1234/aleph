import type { SupportTier } from "./types";

export const SUPPORT_CURRENCY = "NGN";

export const SUPPORT_TIERS: readonly SupportTier[] = [
  { key: "small", label: "A small thank you", amount: "2000.00", currency: SUPPORT_CURRENCY },
  { key: "regular", label: "Keep the lights on", amount: "5000.00", currency: SUPPORT_CURRENCY },
  { key: "generous", label: "A generous gift", amount: "10000.00", currency: SUPPORT_CURRENCY },
];

export function findSupportTier(key: unknown): SupportTier | null {
  if (typeof key !== "string") return null;
  return SUPPORT_TIERS.find((tier) => tier.key === key) ?? null;
}
