import assert from "node:assert/strict";
import XLSX from "xlsx";
import { applyExcelImport, createExcelImportPreview } from "../src/utils/excelImport";
import { initialTripData } from "../src/data/initialTripData";

const planningRows: unknown[][] = [
  ["", "Datum", "", "aantal dagen", "Locatie", "Vervoer", "KM", "duur", "Kosten", "Geboekt", "Annuleren", "Betaald", "Naam"],
  [1, new Date("2026-10-01T12:00:00Z"), "", 1, "San Francisco", "", "", "", 100, "Ja", "Ja", "Ja", "Hotel USA"],
  [2, new Date("2026-10-02T12:00:00Z"), "", 2, "San Francisco → Monterey", "", "", "", 100, "Ja", "Ja", "Ja", "Hotel USA"],
  [3, new Date("2026-10-18T12:00:00Z"), "", 1, "Nadi", "", "", "", 200, "Ja", "Ja", "Ja", "Resort Fiji"],
  [4, new Date("2026-10-19T12:00:00Z"), "", 2, "Kuata Island", "", "", "", 200, "Ja", "Ja", "Ja", "Resort Fiji"],
  [5, new Date("2027-02-15T12:00:00Z"), "", 1, "Tarangire", "Auto", 100, 2, 1200, "Ja", "Nee", "Ja", "Safari Tanzania"],
];

const budgetRows: unknown[][] = Array.from({ length: 40 }, () => []);
const put = (row: number, column: number, value: unknown) => {
  budgetRows[row - 1][column] = value;
};

put(1, 0, "Budget");
put(3, 3, "Zorgverzekering"); put(3, 4, 100);
put(4, 3, "Woonhuis / reis verzekering"); put(4, 4, 20);
put(21, 3, "Aantal maanden op reis"); put(21, 4, 2);
put(3, 6, "Uitrusting"); put(3, 7, 50);
put(4, 6, "Vaccinaties"); put(4, 7, 0);
put(5, 6, "Visa"); put(5, 7, 100);
put(6, 6, "Annulerings verzekering (extra)"); put(6, 7, 50);
put(9, 6, "Vliegtickets"); put(9, 7, 500);
put(6, 0, "Onvoorzien"); put(6, 1, 100);
put(14, 0, "Spaargeld"); put(14, 1, 4000);

put(3, 9, "Maaltijden en boodschappen"); put(3, 10, "Aantal dagen"); put(3, 11, "Dagbudget"); put(3, 12, "Totaal per land");
put(4, 9, "Australië"); put(4, 11, 75);
put(5, 9, "Nieuw-Zeeland"); put(5, 11, 75);
put(6, 9, "Fiji"); put(6, 11, 25);
put(7, 9, "Thailand & SIN & Doha"); put(7, 11, 100);
put(8, 9, "USA"); put(8, 11, 50);
put(9, 9, "Tanzania"); put(9, 11, 0);
put(10, 9, "Uit eten extra"); put(10, 10, 1); put(10, 11, 10);
put(12, 9, "Accommodatie");
put(14, 9, "kosten cabin/hotel"); put(14, 10, 4);
put(15, 9, "Tanzania"); put(15, 10, 1); put(15, 12, 1200);
put(17, 9, "Excursies");
put(18, 9, "Excursies (gepland)");
put(19, 9, "Excursies (niet gepland)"); put(19, 12, 20);

put(33, 0, "Kosten excursies en activiteiten");
put(34, 0, "Amerika");
put(35, 0, "Fietshuur SF"); put(35, 2, "x"); put(35, 3, 80); put(35, 4, "Ja"); put(35, 6, "https://example.com/fietsen");
put(36, 0, "Totaal Attracties");

put(33, 9, "Datum"); put(33, 10, "Van"); put(33, 11, "Naar"); put(33, 12, "Kosten");
put(34, 9, new Date("2026-10-01T12:00:00Z")); put(34, 10, "Amsterdam"); put(34, 11, "San Francisco"); put(34, 12, 500);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(budgetRows, { cellDates: true }), "Budget");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(planningRows, { cellDates: true }), "Planning simpel");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
  [null, "B", "Route / Locatie", "Activiteit / Ferry"],
  [new Date("2026-10-18T12:00:00Z"), "Dag 1", "Nadi", "Transfer naar het resort"],
]), "Planning Fiji");

const preview = createExcelImportPreview(workbook, "excel-regressie.xlsx");
const dashboard = preview.budgetDashboard;
const category = (name: string) => preview.categoryBudgets.find((item) => item.category === name);

assert.equal(preview.timeline.length, 5, "alle geldige reisdagen worden geïmporteerd");
assert.equal(preview.detailSheets.length, 1, "Planning Fiji wordt als detailplanning herkend");
assert.equal(preview.timeline.find((day) => day.date === "2026-10-18")?.activiteiten[0], "Transfer naar het resort");
assert.equal(preview.timeline.find((day) => day.date === "2026-10-02")?.gps.lat, 36.6002, "bij een route wordt de bestemming gebruikt voor de kaartcoördinaten");
assert.notEqual(preview.timeline.find((day) => day.date === "2026-10-19")?.gps.lat, 0, "Kuata Island wordt als kaartlocatie herkend");
assert.equal(preview.flights.length, 1, "de vluchttabel op Budget is een geldige fallback");
assert.equal(preview.flights[0].fromCode, "AMS");
assert.equal(preview.activities.length, 1, "activiteiten op Budget worden geïmporteerd");
assert.equal(preview.savedLocations.length, 1, "activiteitswebsites worden bewaarde locaties");

assert.equal(dashboard.homeCostsEur, 240);
assert.equal(dashboard.upfrontCostsEur, 700);
assert.equal(dashboard.travelCostsEur, 2060);
assert.equal(dashboard.contingencyEur, 100);
assert.equal(dashboard.totalNeededEur, 3100);
assert.equal(dashboard.fundingTotalEur, 4000);
assert.equal(dashboard.countryDailyBudgets?.find((item) => item.country === "USA")?.days, 2, "dagen worden uit Planning simpel afgeleid als formulecaches ontbreken");
assert.equal(dashboard.countryDailyBudgets?.find((item) => item.country === "Fiji")?.totalEur, 50);
assert.equal(category("hotels")?.budgetEur, 1800, "Tanzania wordt niet dubbel bij de cabin/hotel-som opgeteld");
assert.equal(category("boodschappen")?.budgetEur, 160);
assert.equal(category("activiteiten")?.budgetEur, 100);
assert.ok(category("activiteiten")?.sourceLines?.some((line) => line.source === "Budget!A35:G35"));
assert.ok(!preview.warnings.some((warning) => warning.includes("Planning Fiji")));

const currentWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(currentWorkbook, XLSX.utils.aoa_to_sheet([
  ["", "Datum", "", "aantal dagen", "Locatie", "Vervoer", "KM", "duur", "Kosten", "Geboekt", "Annuleren", "Betaald", "Naam"],
  [1, "19-09-2026", "", 1, "San Francisco", "", "", "", 100, "Ja", "Ja", "Ja", "Testhotel"],
]), "Planning simpel");
const dayLayoutSheet = XLSX.utils.aoa_to_sheet([
  ["Datum", "Dag", "Route", "Beschrijving", "Afstand", "Reistijd", "informatie", "Google Maps-route", "Kolom 1"],
  ["Datum", "Dag", "Route", "Beschrijving", "Afstand", "Reistijd", "informatie", "Google Maps-route", "Komoot wandeling", "Komoot wandeling 2"],
  ["19-09-2026", 1, "San Francisco", "Stadswandeling", "", "", "", "https://maps.google.com/test-route", "Kustwandeling", "Bosroute | https://www.komoot.com/tour/222"],
]);
dayLayoutSheet.I3.l = { Target: "https://www.komoot.com/tour/111" };
XLSX.utils.book_append_sheet(currentWorkbook, dayLayoutSheet, "Dagindeling - USA");
XLSX.utils.book_append_sheet(currentWorkbook, XLSX.utils.aoa_to_sheet([
  ["Accomodaties"],
  ["Aankomst datum", "Vertrek datum", "Naam Accomodatie", "Reserveringsnummer", "Kosten", "inchecken (tijd)", "uitchecken (tijd)", "Ontbijt", "Telefoonnummer", "Adres"],
  ["19-09-2026", "20-09-2026", "Testhotel", "ABC123", 100, "15:00", "11:00", "Ja", "+1 555", "1 Market St, San Francisco"],
]), "Accomodatie");
XLSX.utils.book_append_sheet(currentWorkbook, XLSX.utils.aoa_to_sheet([
  ["Kosten excursies en activiteiten ", "", "Betaald", "Geboekt", "Datum", "Adres", "Website"],
  ["Amerika", "", "", "", "", "", ""],
  ["Testactiviteit", 25, "Ja", "Ja", "19-09-2026", "1 Activity Rd", "https://example.com/ticket"],
]), "Excursies en activiteien");
XLSX.utils.book_append_sheet(currentWorkbook, XLSX.utils.aoa_to_sheet([
  ["vliegtickets"],
  ["Vertrek datum", "Vertrek tijd", "Van", "Naar", "Aankomst datum", "Aankomst tijd", "Kosten", "Vlucht Nummer", "Stoelen"],
  ["19-09-2026", "07:55", "Amsterdam", "Londen (Heathrow)", "19-09-2026", "08:15", 100, "BA0445", "1A"],
]), "Vluchten en vervoer");
XLSX.utils.book_append_sheet(currentWorkbook, XLSX.utils.aoa_to_sheet([
  ["NOODNUMMERS"], ["Let op"],
  ["Land", "Algemeen alarm", "Politie", "Ambulance", "Brandweer", "Ambassade / consulaat", "Nederland Wereldwijd", "Ziekenhuis / medische hulp", "Special ISIS", "CZ Helpline", "Belangrijk"],
  ["Verenigde Staten", "911", "911", "911", "911", "Consulaat", "+31 247 247 247", "Ziekenhuis", "+31 182", "+31 13", "Controleer voor vertrek"],
]), "Noodnummers");
XLSX.utils.book_append_sheet(currentWorkbook, XLSX.utils.aoa_to_sheet([
  ["DOCUMENTEN & ADMINISTRATIE"], ["Per persoon"], ["Paspoort"], ["MAN"], ["Kleding"], ["T-shirt"], ["TOILETTAS"], ["Tandenborstel"], ["Gezamenlijk"], ["EHBO"], ["Pleisters"], ["ELEKTRONICA"], ["Oplader"], ["Overige"], ["Handdoek"], ["Spullen kinderen"], ["Knuffel"],
]), "Paklijst");
const currentPreview = createExcelImportPreview(currentWorkbook, "actuele-indeling.xlsx");
assert.equal(currentPreview.timeline[0].routeUrl, "https://maps.google.com/test-route");
assert.equal(currentPreview.timeline[0].komootRoutes?.length, 2, "meerdere Komoot-wandelingen worden per reisdag geïmporteerd");
assert.equal(currentPreview.timeline[0].komootRoutes?.[0].title, "Kustwandeling", "de hyperlinktekst wordt als routenaam gebruikt");
assert.equal(currentPreview.timeline[0].komootRoutes?.[0].url, "https://www.komoot.com/tour/111", "een echte Excel-hyperlink wordt gelezen");
assert.equal(currentPreview.timeline[0].komootRoutes?.[1].url, "https://www.komoot.com/tour/222", "een geplakte Komoot-URL wordt ook gelezen");
assert.equal(currentPreview.timeline[0].komootRoutes?.[1].title, "Bosroute", "naam en URL kunnen samen op één regel staan");
assert.equal(currentPreview.flights[0].departureTime, "07:55");
assert.equal(currentPreview.flights[0].arrivalTime, "08:15");
assert.equal(currentPreview.flights[0].toCode, "LHR");
assert.equal(currentPreview.accommodations[0].address, "1 Market St, San Francisco");
assert.equal(currentPreview.accommodations[0].phone, "+1 555");
assert.equal(currentPreview.activities[0].booked, true);
assert.equal(currentPreview.activities[0].paid, true);
assert.equal(currentPreview.activities[0].address, "1 Activity Rd");
assert.equal(currentPreview.emergencies[0].netherlandsWorldwide, "+31 247 247 247");
assert.ok(currentPreview.packingItems.some((item) => item.person === "Bas" && item.category === "Toilettas"));
assert.ok(currentPreview.packingItems.some((item) => item.person === "Algemeen" && item.category === "EHBO"));
assert.ok(currentPreview.packingItems.some((item) => item.person === "Spullen kinderen"));

const localData = structuredClone(initialTripData);
const importedAccommodation = currentPreview.accommodations[0];
localData.accommodations = [
  { ...importedAccommodation, phone: "+31 lokaal aangepast", localModifiedAt: "2026-08-20T10:00:00.000Z" },
  { id: "accommodation-manual-test", name: "Onderweg toegevoegd", checkIn: "2026-10-20", checkOut: "2026-10-21", source: "manual" },
];
localData.deletedItemIds = [currentPreview.activities[0].id];
const importedWithLocalChanges = applyExcelImport(localData, currentPreview, true);
assert.equal(importedWithLocalChanges.accommodations.find((item) => item.id === importedAccommodation.id)?.phone, "+31 lokaal aangepast", "lokale wijzigingen blijven bij vervangende Excel-import behouden");
assert.ok(importedWithLocalChanges.accommodations.some((item) => item.id === "accommodation-manual-test"), "handmatig toegevoegde regels blijven bij Excel-import behouden");
assert.ok(!importedWithLocalChanges.activities.some((item) => item.id === currentPreview.activities[0].id), "handmatig verwijderde regels komen niet terug na Excel-import");

console.log("Excel-importregressie geslaagd: formulefallbacks, detailplanning, vluchten, activiteiten en budgettotalen kloppen.");
