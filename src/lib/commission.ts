// Commission calculation engine

export interface CommissionTier {
  id: string;
  minRevenue: number;
  maxRevenue: number | null; // null = uncapped
  rate: number; // percentage (e.g. 10 = 10%)
  label?: string;
}

export interface CommissionPlan {
  name: string;
  tiers: CommissionTier[];
  baseSalary: number;
  ote: number;
  quota: number;
  mode: 'marginal' | 'flat';
}

export interface TierBreakdown {
  tier: CommissionTier;
  applicableRevenue: number;
  commission: number;
}

export interface CommissionResult {
  totalCommission: number;
  totalEarnings: number; // base + commission
  effectiveRate: number; // total commission / deal size as %
  breakdowns: TierBreakdown[];
  quotaAttainment: number; // as percentage
}

export function calculateCommission(
  plan: CommissionPlan,
  dealAmount: number
): CommissionResult {
  if (dealAmount <= 0) {
    return {
      totalCommission: 0,
      totalEarnings: plan.baseSalary,
      effectiveRate: 0,
      breakdowns: [],
      quotaAttainment: plan.quota > 0 ? 0 : 100,
    };
  }

  const sortedTiers = [...plan.tiers].sort((a, b) => a.minRevenue - b.minRevenue);

  if (plan.mode === 'flat') {
    return calculateFlat(plan, sortedTiers, dealAmount);
  }
  return calculateMarginal(plan, sortedTiers, dealAmount);
}

function calculateMarginal(
  plan: CommissionPlan,
  tiers: CommissionTier[],
  dealAmount: number
): CommissionResult {
  const breakdowns: TierBreakdown[] = [];
  let totalCommission = 0;

  for (const tier of tiers) {
    const min = tier.minRevenue;
    const max = tier.maxRevenue ?? Infinity;

    if (dealAmount <= min) break;

    const applicableRevenue = Math.min(dealAmount, max) - min;
    if (applicableRevenue <= 0) continue;

    const commission = applicableRevenue * (tier.rate / 100);
    totalCommission += commission;

    breakdowns.push({ tier, applicableRevenue, commission });
  }

  return {
    totalCommission,
    totalEarnings: plan.baseSalary + totalCommission,
    effectiveRate: dealAmount > 0 ? (totalCommission / dealAmount) * 100 : 0,
    breakdowns,
    quotaAttainment: plan.quota > 0 ? (dealAmount / plan.quota) * 100 : 100,
  };
}

function calculateFlat(
  plan: CommissionPlan,
  tiers: CommissionTier[],
  dealAmount: number
): CommissionResult {
  // In flat mode, find the tier the deal falls into and apply that rate to the whole deal
  let matchedTier: CommissionTier | null = null;

  for (const tier of tiers) {
    const max = tier.maxRevenue ?? Infinity;
    if (dealAmount >= tier.minRevenue && dealAmount < max) {
      matchedTier = tier;
      break;
    }
  }

  if (!matchedTier) {
    // Use last tier if deal exceeds all ranges
    matchedTier = tiers[tiers.length - 1] || null;
  }

  if (!matchedTier) {
    return {
      totalCommission: 0,
      totalEarnings: plan.baseSalary,
      effectiveRate: 0,
      breakdowns: [],
      quotaAttainment: plan.quota > 0 ? (dealAmount / plan.quota) * 100 : 100,
    };
  }

  const commission = dealAmount * (matchedTier.rate / 100);

  return {
    totalCommission: commission,
    totalEarnings: plan.baseSalary + commission,
    effectiveRate: matchedTier.rate,
    breakdowns: [{ tier: matchedTier, applicableRevenue: dealAmount, commission }],
    quotaAttainment: plan.quota > 0 ? (dealAmount / plan.quota) * 100 : 100,
  };
}

// Preset plans
export function createId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export const PRESETS: Record<string, () => CommissionPlan> = {
  'Flat 10%': () => ({
    name: 'Flat 10%',
    baseSalary: 50000,
    ote: 100000,
    quota: 500000,
    mode: 'flat',
    tiers: [
      { id: createId(), minRevenue: 0, maxRevenue: null, rate: 10 },
    ],
  }),

  'Standard Tiered': () => ({
    name: 'Standard Tiered',
    baseSalary: 60000,
    ote: 120000,
    quota: 600000,
    mode: 'marginal',
    tiers: [
      { id: createId(), minRevenue: 0, maxRevenue: 200000, rate: 5, label: 'Base' },
      { id: createId(), minRevenue: 200000, maxRevenue: 500000, rate: 10, label: 'Mid' },
      { id: createId(), minRevenue: 500000, maxRevenue: null, rate: 15, label: 'Accelerator' },
    ],
  }),

  'Accelerator': () => ({
    name: 'Accelerator',
    baseSalary: 70000,
    ote: 140000,
    quota: 1000000,
    mode: 'marginal',
    tiers: [
      { id: createId(), minRevenue: 0, maxRevenue: 500000, rate: 5, label: '0-50% quota' },
      { id: createId(), minRevenue: 500000, maxRevenue: 1000000, rate: 10, label: '50-100% quota' },
      { id: createId(), minRevenue: 1000000, maxRevenue: 1500000, rate: 15, label: '100-150% quota' },
      { id: createId(), minRevenue: 1500000, maxRevenue: null, rate: 20, label: '150%+ quota' },
    ],
  }),

  'Decelerator': () => ({
    name: 'Decelerator',
    baseSalary: 80000,
    ote: 130000,
    quota: 800000,
    mode: 'marginal',
    tiers: [
      { id: createId(), minRevenue: 0, maxRevenue: 400000, rate: 12, label: 'First half' },
      { id: createId(), minRevenue: 400000, maxRevenue: 800000, rate: 8, label: 'Second half' },
      { id: createId(), minRevenue: 800000, maxRevenue: null, rate: 5, label: 'Above quota' },
    ],
  }),
};
