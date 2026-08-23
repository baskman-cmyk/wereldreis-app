import path from "node:path";
import XLSX from "xlsx";
import { createExcelImportPreview } from "../src/utils/excelImport";

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("Gebruik: npm run audit:excel -- /pad/naar/werkmap.xlsx");
}

const workbook = XLSX.readFile(inputPath, { cellDates: true });
const preview = createExcelImportPreview(workbook, path.basename(inputPath));

console.log(JSON.stringify({
  fileName: preview.fileName,
  sheets: preview.sheets,
  counts: {
    timeline: preview.timeline.length,
    countries: preview.countries.length,
    detailSheets: preview.detailSheets.length,
    flights: preview.flights.length,
    accommodations: preview.accommodations.length,
    carRentals: preview.carRentals.length,
    activities: preview.activities.length,
    savedLocations: preview.savedLocations.length,
    checklists: preview.checklists.length,
    documents: preview.documents.length,
    packingItems: preview.packingItems.length,
    budgetExpenses: preview.budgetExpenses.length,
    categoryBudgets: preview.categoryBudgets.length,
    timelineByCountry: Object.fromEntries(Array.from(new Set(preview.timeline.map((day) => day.land))).map((country) => [country, preview.timeline.filter((day) => day.land === country).length])),
  },
  budget: {
    homeCostsEur: preview.budgetDashboard.homeCostsEur,
    upfrontCostsEur: preview.budgetDashboard.upfrontCostsEur,
    travelCostsEur: preview.budgetDashboard.travelCostsEur,
    contingencyEur: preview.budgetDashboard.contingencyEur,
    totalNeededEur: preview.budgetDashboard.totalNeededEur,
    alreadyPaidEur: preview.budgetDashboard.alreadyPaidEur,
    fundingTotalEur: preview.budgetDashboard.fundingTotalEur,
    monthlyIncomeEur: preview.budgetDashboard.monthlyIncomeEur,
    countryDailyBudgets: preview.budgetDashboard.countryDailyBudgets,
    categoryBudgets: preview.categoryBudgets,
  },
  warnings: preview.warnings,
}, null, 2));
