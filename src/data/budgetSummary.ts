import type { BudgetDashboardData } from "../types";

export const CORRECTED_BUDGET_SUMMARY = {
  homeCostsEur: 10_455.75,
  upfrontCostsEur: 3_800,
  travelCostsEur: 76_723.91,
  contingencyEur: 5_000,
  totalNeededEur: 95_979.66,
  alreadyPaidEur: 30_778.91,
  fundingTotalEur: 119_000,
  fundingDifferenceEur: 23_020.34,
  paidBreakdown: [
    { label: "Vluchten", amountEur: 0 },
    { label: "Accommodaties", amountEur: 29_533.91 },
    { label: "Excursies", amountEur: 1_245 },
  ],
  fundingLines: [
    { label: "Salaris", amountEur: 37_000, source: "Gecontroleerde Excel-samenvatting" },
    { label: "Spaarrekening Wereldreis", amountEur: 62_000, source: "Gecontroleerde Excel-samenvatting" },
    { label: "Huurinkomsten", amountEur: 14_000, source: "Gecontroleerde Excel-samenvatting" },
    { label: "Vakantie spaarrekening", amountEur: 6_000, source: "Gecontroleerde Excel-samenvatting" },
  ],
} satisfies Partial<BudgetDashboardData>;

export const withCorrectedBudgetSummary = (dashboard?: BudgetDashboardData): BudgetDashboardData => ({
  ...(dashboard || {}),
  ...CORRECTED_BUDGET_SUMMARY,
  totalBudget: CORRECTED_BUDGET_SUMMARY.totalNeededEur,
  totalNeeded: CORRECTED_BUDGET_SUMMARY.totalNeededEur,
  totalAvailable: CORRECTED_BUDGET_SUMMARY.fundingTotalEur,
  totalPaid: CORRECTED_BUDGET_SUMMARY.alreadyPaidEur,
  totalSpent: CORRECTED_BUDGET_SUMMARY.alreadyPaidEur,
  remaining: CORRECTED_BUDGET_SUMMARY.totalNeededEur - CORRECTED_BUDGET_SUMMARY.alreadyPaidEur,
  homeCosts: CORRECTED_BUDGET_SUMMARY.homeCostsEur,
  preTripCosts: CORRECTED_BUDGET_SUMMARY.upfrontCostsEur,
  travelCosts: CORRECTED_BUDGET_SUMMARY.travelCostsEur,
  contingency: CORRECTED_BUDGET_SUMMARY.contingencyEur,
  funding: CORRECTED_BUDGET_SUMMARY.fundingTotalEur,
  sourceSheet: "Budget · gecontroleerde totalen",
});
