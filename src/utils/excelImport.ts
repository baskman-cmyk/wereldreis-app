import * as XLSX from "xlsx";
import {
  Accommodation,
  ActivityItem,
  CategoryBudget,
  ChecklistItem,
  CountryPlan,
  DocumentItem,
  ExpenseItem,
  Flight,
  GPSLocation,
  SavedLocation,
  TimelineDay,
  TripDataState,
  PackingItem,
  CarRentalDetails,
  BudgetDashboardData,
  BudgetDashboardLine,
  DayPlanItem,
  EmergencyCountryProfile,
  KomootRoute,
} from "../types";

type Row = Record<string, unknown>;

export interface ExcelImportPreview {
  fileName: string;
  sheets: string[];
  timeline: TimelineDay[];
  countries: CountryPlan[];
  accommodations: Accommodation[];
  flights: Flight[];
  activities: ActivityItem[];
  savedLocations: SavedLocation[];
  checklists: ChecklistItem[];
  documents: DocumentItem[];
  budgetExpenses: ExpenseItem[];
  categoryBudgets: CategoryBudget[];
  packingItems: PackingItem[];
  carRentals: CarRentalDetails[];
  emergencies: EmergencyCountryProfile[];
  budgetDashboard: BudgetDashboardData;
  warnings: string[];
  detailSheets: string[];
}

const normalize = (value: unknown) => String(value ?? "").trim();
const compact = (value: unknown) => normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
const yes = (value: unknown) => ["ja", "yes", "x", "betaald", "geboekt", "klaar", "done"].includes(normalize(value).toLowerCase());
const numberValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  let text = normalize(value).replace(/[^0-9,.-]/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    text = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (comma >= 0) {
    text = /,\d{1,2}$/.test(text) ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (dot >= 0) {
    text = /^-?\d+\.\d{1,2}$/.test(text) ? text : text.replace(/\./g, "");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const excelDateToIso = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  if (typeof value === "number") {
    const parsed = new Date(Math.round((value - 25569) * 86_400_000));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  const text = normalize(value);
  if (!text) return "";
  const match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    const slashMonthFirst = text.includes("/") && match[3].length === 2 && Number(match[1]) <= 12;
    const month = slashMonthFirst ? match[1] : match[2];
    const day = slashMonthFirst ? match[2] : match[1];
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const rowValue = (row: Row, aliases: string[]): unknown => {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const found = entries.find(([header]) => compact(header) === compact(alias));
    if (found) return found[1];
  }
  return undefined;
};

const rowsFromSheet = (workbook: XLSX.WorkBook, sheetName: string, header = 0): Row[] => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: true, range: header });
};

const rowsFromSheetFormatted = (workbook: XLSX.WorkBook, sheetName: string, header = 0): Row[] => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false, range: header });
};

const detectHeaderRow = (workbook: XLSX.WorkBook, sheetName: string, requiredHeaders: string[]): number => {
  const rows = rawRows(workbook, sheetName);
  const wanted = requiredHeaders.map(compact);
  const index = rows.findIndex((row) => {
    const headers = row.map(compact);
    return wanted.every((required) => headers.some((header) => header === required));
  });
  return index >= 0 ? index : 0;
};

const rawRows = (workbook: XLSX.WorkBook, sheetName: string): unknown[][] => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
};

const rawRowsFormatted = (workbook: XLSX.WorkBook, sheetName: string): unknown[][] => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
};

const excelTimeToText = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    const totalMinutes = Math.round((((value % 1) + 1) % 1) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const text = normalize(value);
  const time = text.match(/(?:^|\s)(\d{1,2})[:.]([0-5]\d)(?:\s|$)/);
  return time ? `${time[1].padStart(2, "0")}:${time[2]}` : text;
};

const findSheet = (sheetNames: string[], exactOrAliases: string[]): string | undefined =>
  sheetNames.find((name) => exactOrAliases.some((candidate) => compact(name) === compact(candidate))) ||
  sheetNames.find((name) => exactOrAliases.some((candidate) => compact(name).includes(compact(candidate))));

const countryForDate = (date: string): string => {
  if (date <= "2026-10-16") return "Verenigde Staten";
  if (date <= "2026-10-26") return "Fiji";
  if (date <= "2026-12-13") return "Australië";
  if (date <= "2027-01-21") return "Nieuw-Zeeland";
  if (date <= "2027-01-25") return "Singapore";
  if (date <= "2027-02-11") return "Thailand";
  if (date <= "2027-02-13") return "Qatar";
  if (date <= "2027-02-23") return "Tanzania";
  return "Onbekend";
};

const FLAG: Record<string, string> = {
  "Verenigde Staten": "🇺🇸", Fiji: "🇫🇯", Australië: "🇦🇺", "Nieuw-Zeeland": "🇳🇿",
  Singapore: "🇸🇬", Thailand: "🇹🇭", Qatar: "🇶🇦", Tanzania: "🇹🇿", Onbekend: "🌍",
};

const COORDS: Array<[RegExp, number, number]> = [
  [/amsterdam/i, 52.3676, 4.9041],
  [/san francisco/i, 37.7749, -122.4194], [/monterey|carmel/i, 36.6002, -121.8947], [/san simeon/i, 35.6439, -121.1893],
  [/santa barbara|buellton/i, 34.4208, -119.6982], [/los angeles|venice|anaheim|marina del rey/i, 34.0522, -118.2437],
  [/kingman/i, 35.1894, -114.053], [/grand canyon/i, 36.1069, -112.1129], [/kayenta|monument valley|bluff/i, 36.7278, -110.2546],
  [/kanab/i, 37.0475, -112.5263], [/bryce/i, 37.6283, -112.1677], [/zion|virgin/i, 37.2982, -113.0263],
  [/las vegas/i, 36.1699, -115.1398], [/mammoth/i, 37.6485, -118.9721], [/yosemite/i, 37.8651, -119.5383],
  [/door vlucht dag verschil|volgende dag aankomst.*tijdverschil/i, -17.7765, 177.4356],
  [/nadi|fiji/i, -17.7765, 177.4356], [/plantation|malolo lailai/i, -17.777, 177.197], [/denarau|tokatoka/i, -17.772, 177.381], [/kuata/i, -17.369, 177.137],
  [/brisbane/i, -27.4698, 153.0251], [/byron/i, -28.6474, 153.602],
  [/springbrook/i, -28.1916, 153.2706], [/lamington/i, -28.244, 153.14], [/glass house|beerwah|maleny|montville/i, -26.8972, 152.9491],
  [/rainbow beach/i, -25.904, 153.091], [/noosa/i, -26.388, 153.09],
  [/port douglas/i, -16.4837, 145.465], [/cape trib/i, -16.0836, 145.461], [/atherton|tablelands|mareeba/i, -17.2686, 145.4752], [/cairns/i, -16.9186, 145.7781],
  [/sydney/i, -33.8688, 151.2093], [/bendalong/i, -35.245, 150.532], [/tuross/i, -36.0583, 150.1312], [/narooma/i, -36.218, 150.132],
  [/eden/i, -37.063, 149.903], [/traralgon/i, -38.195, 146.538], [/wilsons prom/i, -39.03, 146.32],
  [/yarra ranges|warburton/i, -37.753, 145.69], [/bimbi|cape otway/i, -38.8327, 143.5127], [/mount macedon|mt macedon/i, -37.423, 144.584],
  [/melbourne/i, -37.8136, 144.9631], [/christchurch/i, -43.5321, 172.6362], [/tekapo/i, -44.0047, 170.4771],
  [/mount cook|aoraki/i, -43.595, 170.142], [/te anau/i, -45.4145, 167.718], [/queenstown/i, -45.0312, 168.6626],
  [/wanaka/i, -44.696, 169.136], [/franz josef/i, -43.3896, 170.1842], [/punakaiki/i, -42.114, 171.326],
  [/abel tasman|marahau/i, -40.965, 173.027], [/pohara|collingwood/i, -40.824, 172.901], [/picton/i, -41.29, 174.0],
  [/wellington/i, -41.2866, 174.7756], [/taranaki|new plymouth|mangorei/i, -39.2968, 174.0632], [/waitomo/i, -38.2607, 175.104],
  [/taupo/i, -38.6857, 176.0702], [/rotorua/i, -38.1368, 176.2497], [/coromandel|hot water beach|hahei/i, -36.887, 175.82], [/auckland/i, -36.8509, 174.7645],
  [/singapore/i, 1.3521, 103.8198], [/phuket/i, 7.8804, 98.3923], [/khao lak/i, 8.65, 98.25], [/khao sok/i, 8.91, 98.53],
  [/koh lanta/i, 7.624, 99.079], [/ao nang|railay/i, 8.032, 98.822], [/doha/i, 25.2854, 51.531],
  [/arusha/i, -3.3869, 36.683], [/tarangire/i, -3.833, 36.0], [/ndutu/i, -2.99, 34.99], [/serengeti|kubu kubu/i, -2.3333, 34.8333], [/ngorongoro|karatu/i, -3.24, 35.49],
  [/kilimanjaro/i, -3.0674, 37.3556],
];

const gpsFor = (text: string): GPSLocation => {
  // Een route bevat vaak zowel vertrek als bestemming. De laatst genoemde herkenbare
  // plaats is daarom leidend; `COORDS.find` koos vroeger geregeld het vertrekpunt.
  const matches = COORDS.flatMap(([pattern, lat, lng]) => {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const indexes = Array.from(text.matchAll(new RegExp(pattern.source, flags))).map((match) => match.index ?? -1);
    return indexes.length ? [{ index: Math.max(...indexes), lat, lng }] : [];
  });
  const found = matches.sort((a, b) => b.index - a.index)[0];
  return found ? { lat: found.lat, lng: found.lng, label: text } : { lat: 0, lng: 0, label: text };
};

const placeFromRoute = (value: unknown): string => {
  const text = normalize(value).replace(/[✈️🚐🚗]/g, "").replace(/\b\d{1,2}:\d{2}\b/g, "").trim();
  if (!text) return "Nog invullen";
  const parts = text.split(/→|➔|>|–|—/).map((part) => part.trim()).filter(Boolean);
  return (parts.at(-1) || text).replace(/\([^)]*route[^)]*\)/i, "").trim();
};

const booleanValue = (value: unknown): boolean | undefined => {
  const text = normalize(value).toLowerCase();
  if (!text) return undefined;
  if (["ja", "yes", "true", "x", "1", "inbegrepen", "betaald", "geboekt"].includes(text)) return true;
  if (["nee", "no", "false", "0", "niet", "n.v.t.", "nvt"].includes(text)) return false;
  return undefined;
};

const normalizeDuration = (value: unknown): string => {
  const raw = normalize(value);
  if (!raw || raw === "-") return "";
  if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
    const hours = Number(raw.replace(",", "."));
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    if (whole && minutes) return `${whole} uur ${minutes} min`;
    if (whole) return `${whole} uur`;
    return `${minutes} min`;
  }
  return raw
    .replace(/\b(\d+)u(\d{1,2})\b/gi, "$1 uur $2 min")
    .replace(/\b(\d+)u\b/gi, "$1 uur");
};

const splitDescriptionLines = (value: unknown): string[] => {
  const text = normalize(value);
  if (!text) return [];
  return text
    .replace(/\r/g, "\n")
    .replace(/\s+-\s+(?=\d{1,2}[.:]\d{2}\b)/g, "\n- ")
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-•–—]\s*/, ""))
    .filter(Boolean)
    .filter((line) => !/^dag\s*\d+\s*[–—-]/i.test(line));
};

const planItemsFromDescription = (
  description: unknown,
  route: string,
  distanceKm: number,
  travelDuration: string,
  info: string,
  date: string,
): DayPlanItem[] => {
  const result: DayPlanItem[] = [];
  if (route && (distanceKm > 0 || travelDuration)) {
    result.push({
      id: `travel-${date}`,
      title: route,
      kind: /✈|vlucht/i.test(route) ? "flight" : "travel",
      travelDuration: travelDuration || undefined,
      distanceKm: distanceKm || undefined,
    });
  }
  splitDescriptionLines(description).forEach((line, index) => {
    const timeMatch = line.match(/^(\d{1,2}[.:]\d{2})(?:\s*[–—-]\s*(\d{1,2}[.:]\d{2}))?\s*(.*)$/);
    const embeddedTime = line.match(/\b(?:aankomst|vertrek)?\s*tijd\s*(\d{1,2}[.:]\d{2})\b/i)?.[1];
    const title = (timeMatch?.[3] || line).trim();
    const parts = title.split(/\s{2,}|\s+[–—]\s+/).map((part) => part.trim()).filter(Boolean);
    result.push({
      id: `activity-${date}-${index + 1}`,
      time: (timeMatch?.[1] || embeddedTime)?.replace(".", ":"),
      endTime: timeMatch?.[2]?.replace(".", ":"),
      title: parts[0] || title,
      detail: parts.slice(1).join(" · ") || undefined,
      kind: /^(rit|vertrek|aankomst|transfer|ferry|auto|bus|trein|vlucht)\b/i.test(title) ? "travel" : "activity",
    });
  });
  if (info) {
    result.push({ id: `note-${date}`, title: "Praktische informatie", detail: info, kind: "note" });
  }
  return result;
};

function parseGlobalPlanning(workbook: XLSX.WorkBook, warnings: string[]) {
  const sheetName = findSheet(workbook.SheetNames, ["Planning simpel"]);
  if (!sheetName) {
    warnings.push("Het vaste tabblad ‘Planning simpel’ ontbreekt.");
    return { timeline: [] as TimelineDay[], sourceRows: [] as Row[] };
  }
  const rows = rowsFromSheetFormatted(workbook, sheetName);
  const sourceRows: Row[] = [];
  const timeline = rows.flatMap((row, index) => {
    const date = excelDateToIso(rowValue(row, ["Datum"]));
    const route = normalize(rowValue(row, ["Locatie"]));
    if (!date || !route) return [];
    sourceRows.push(row);
    const place = placeFromRoute(route);
    const transport = normalize(rowValue(row, ["Vervoer"]));
    const km = numberValue(rowValue(row, ["KM"]));
    const duration = normalizeDuration(rowValue(row, ["duur", "Reistijd"]));
    const booked = booleanValue(rowValue(row, ["Geboekt"]));
    const cancellable = booleanValue(rowValue(row, ["Annuleren", "Annuleerbaar"]));
    const paid = booleanValue(rowValue(row, ["Betaald"]));
    const bookedAt = normalize(rowValue(row, ["Geboekt bij"]));
    const breakfast = booleanValue(rowValue(row, ["Ontbijt"]));
    const kitchen = booleanValue(rowValue(row, ["Keuken"]));
    const pool = booleanValue(rowValue(row, ["Zwembad"]));
    const basePlanItems: DayPlanItem[] = [];
    if (transport || km || duration) {
      basePlanItems.push({
        id: `global-travel-${date}`,
        title: transport || route,
        kind: /✈|vlucht/i.test(`${transport} ${route}`) ? "flight" : "travel",
        distanceKm: km || undefined,
        travelDuration: duration || undefined,
      });
    }
    return [{
      id: `excel-day-${date}`,
      dayNumber: numberValue(rowValue(row, ["aantal dagen", "Dag"])) || index + 1,
      date,
      land: countryForDate(date),
      plaats: place,
      overnachting: normalize(rowValue(row, ["Naam"])) || "Nog invullen",
      activiteiten: [],
      fotos: [],
      notities: "",
      uitgaven: [],
      gps: gpsFor(`${route} ${place}`),
      isCompleted: false,
      route,
      transportMode: transport || undefined,
      distanceKm: km || undefined,
      travelDuration: duration || undefined,
      planItems: basePlanItems,
      accommodationFeatures: {
        booked,
        cancellable,
        paid,
        bookedVia: bookedAt || undefined,
        breakfast,
        kitchen,
        pool,
      },
    } satisfies TimelineDay];
  });
  return { timeline: timeline.sort((a, b) => a.date.localeCompare(b.date)), sourceRows };
}

const detailCountry = (sheetName: string): string[] => {
  const n = compact(sheetName);
  if (n.includes("usa")) return ["Verenigde Staten"];
  if (n.includes("fiji")) return ["Fiji"];
  if (n.includes("brisbane") || n.includes("fnq") || n.includes("sydneymtmaced")) return ["Australië"];
  if (n.includes("nieuwzeeland") || n.includes("nzauto")) return ["Nieuw-Zeeland"];
  if (n.includes("thailand")) return ["Thailand"];
  if (n.includes("singapore")) return ["Singapore", "Qatar"];
  if (n.includes("tanzania")) return ["Tanzania"];
  return [];
};

function mergeDetailPlanning(workbook: XLSX.WorkBook, timeline: TimelineDay[], warnings: string[]): string[] {
  const detailSheets = workbook.SheetNames.filter((name) => {
    const key = compact(name);
    return key.startsWith("dagplanning") || key.startsWith("dagindeling") || (key.startsWith("planning") && key !== "planningsimpel");
  });
  const byDate = new Map(timeline.map((day) => [day.date, day]));
  for (const sheetName of detailSheets) {
    const sheetRows = rawRows(workbook, sheetName);
    const komootHeaderRow = sheetRows.findIndex((row) => row.some((cell) => compact(cell).includes("komoot")));
    const headerRow = komootHeaderRow >= 0 ? komootHeaderRow : detectHeaderRow(workbook, sheetName, ["Dag"]);
    const rows = rowsFromSheetFormatted(workbook, sheetName, headerRow);
    const countries = detailCountry(sheetName);
    const candidates = timeline.filter((day) => countries.includes(day.land));
    let matched = 0;
    rows.forEach((row, rowIndex) => {
      const explicitDate = rowValue(row, ["Datum"]);
      const firstValue = Object.values(row)[0];
      const firstValueLooksLikeDate =
        firstValue instanceof Date ||
        (typeof firstValue === "number" && firstValue > 30000) ||
        (typeof firstValue === "string" && /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(firstValue.trim()));
      let date = excelDateToIso(explicitDate);
      if (!date && firstValueLooksLikeDate) date = excelDateToIso(firstValue);
      const dayNumber = numberValue(rowValue(row, ["Dag"]));
      const route = normalize(rowValue(row, ["Route", "Plaats", "Locatie", "Route / Locatie"]));
      const description = normalize(rowValue(row, ["Beschrijving", "Activiteit", "Activiteit / Verplaatsing", "Activiteit / Ferry", "Omschrijving"]));
      const distanceKm = numberValue(rowValue(row, ["Afstand", "KM"]));
      const travelDuration = normalizeDuration(rowValue(row, ["Reistijd"]));
      const info = normalize(rowValue(row, ["informatie", "Notities", "Praktische informatie"]));
      const routeUrl = normalize(rowValue(row, ["Google Maps-route", "Google Maps route", "Route link", "Google Maps"]));
      const komootRoutes = komootRoutesForRow(workbook, sheetName, headerRow, row, rowIndex);
      if (!date && dayNumber) {
        const candidate = candidates[dayNumber - 1];
        if (candidate) date = candidate.date;
      }
      const day = date ? byDate.get(date) : undefined;
      if (!day || (!route && !description && !info && !komootRoutes.length)) return;

      const detailItems = planItemsFromDescription(description, route, distanceKm, travelDuration, info, day.date);
      const existing = day.planItems || [];
      const dedupeKey = (item: DayPlanItem) => `${item.kind}|${item.time || ""}|${item.title}`.toLowerCase();
      const merged = new Map(existing.map((item) => [dedupeKey(item), item]));
      detailItems.forEach((item) => merged.set(dedupeKey(item), item));
      day.planItems = Array.from(merged.values());
      day.activiteiten = splitDescriptionLines(description);
      day.samenvatting = info || undefined;
      day.route = route || day.route;
      if (/^https?:\/\//i.test(routeUrl)) day.routeUrl = routeUrl;
      if (komootRoutes.length) {
        const existingRoutes = day.komootRoutes || [];
        day.komootRoutes = [...existingRoutes, ...komootRoutes].filter((route, index, all) => all.findIndex((item) => item.url === route.url) === index);
      }
      if (distanceKm) day.distanceKm = distanceKm;
      if (travelDuration) day.travelDuration = travelDuration;
      if (day.gps.lat === 0 && route) day.gps = gpsFor(route);
      matched += 1;
    });
    if (!matched) warnings.push(`Geen regels uit ‘${sheetName}’ konden aan een reisdag worden gekoppeld.`);
  }
  return detailSheets;
}

function komootRoutesForRow(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headerRow: number,
  row: Row,
  rowIndex: number,
): KomootRoute[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  const dataRow = headerRow + rowIndex + 1;
  const routes: KomootRoute[] = [];

  Object.entries(row).forEach(([header, rawValue]) => {
    const headerKey = compact(header);
    const isKomootColumn =
      headerKey.includes("komoot") ||
      headerKey === "wandeling" ||
      headerKey === "wandelingen" ||
      headerKey === "wandelroute" ||
      headerKey === "wandelroutes";
    if (!isKomootColumn) return;
    let column = -1;
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const headerCell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: col })];
      if (compact(headerCell?.w ?? headerCell?.v) === compact(header)) { column = col; break; }
    }
    const cell = column >= 0 ? sheet[XLSX.utils.encode_cell({ r: dataRow, c: column })] : undefined;
    const hyperlink = normalize(cell?.l?.Target).replace(/&amp;/g, "&");
    const value = normalize(rawValue);
    const namedRoutes = value.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
      const url = line.match(/https?:\/\/[^\s|]+/i)?.[0]?.replace(/[),.]+$/, "");
      if (!url) return [];
      const title = line.replace(url, "").replace(/^[\s|:–—-]+|[\s|:–—-]+$/g, "").trim();
      return [{ url, title }];
    });
    if (hyperlink && !namedRoutes.some((item) => item.url === hyperlink)) namedRoutes.unshift({ url: hyperlink, title: value && !/^https?:\/\//i.test(value) ? value : "" });
    namedRoutes.filter((route, index, all) => all.findIndex((item) => item.url === route.url) === index).forEach(({ url, title: routeTitle }, index) => {
      if (!/^https?:\/\//i.test(url)) return;
      const title = routeTitle || `Wandeling ${routes.length + 1}`;
      routes.push({ id: `komoot-${sheetName}-${dataRow + 1}-${column}-${index}`, title, url });
    });
  });
  return routes;
}

function parseAccommodations(workbook: XLSX.WorkBook, timeline: TimelineDay[], sourceRows: Row[]): Accommodation[] {
  const sheetName = findSheet(workbook.SheetNames, ["Accomodatie", "Accommodatie"]);
  if (sheetName) {
    const headerRow = detectHeaderRow(workbook, sheetName, ["Aankomst datum", "Naam Accomodatie"]);
    const rows = rowsFromSheetFormatted(workbook, sheetName, headerRow);
    const accommodations = rows.flatMap((row, index) => {
      const checkIn = excelDateToIso(rowValue(row, ["Aankomst datum", "Incheckdatum"]));
      const checkOut = excelDateToIso(rowValue(row, ["Vertrek datum", "Uitcheckdatum"]));
      const name = normalize(rowValue(row, ["Naam Accomodatie", "Naam Accommodatie", "Naam"]));
      if (!checkIn || !name || /^totaal/i.test(name)) return [];
      const planningRow = sourceRows.find((source) => {
        const sourceDate = excelDateToIso(rowValue(source, ["Datum"]));
        const sourceName = normalize(rowValue(source, ["Naam"]));
        return sourceDate >= checkIn && (!checkOut || sourceDate < checkOut) && (!sourceName || compact(sourceName) === compact(name));
      }) || sourceRows.find((source) => excelDateToIso(rowValue(source, ["Datum"])) === checkIn) || {};
      const timelineDay = timeline.find((day) => day.date >= checkIn && (!checkOut || day.date < checkOut)) || timeline.find((day) => day.date === checkIn);
      const address = normalize(rowValue(row, ["Adres"]));
      const phone = normalize(rowValue(row, ["Telefoonnummer", "Telefoon"]));
      const bookingReference = normalize(rowValue(row, ["Reserveringsnummer", "Boekingsnummer"]));
      const price = numberValue(rowValue(row, ["Kosten", "Prijs"]));
      const features = {
        booked: booleanValue(rowValue(planningRow, ["Geboekt"])),
        cancellable: booleanValue(rowValue(planningRow, ["Annuleren", "Annuleerbaar"])),
        paid: booleanValue(rowValue(planningRow, ["Betaald"])),
        bookedVia: normalize(rowValue(planningRow, ["Geboekt bij"])) || undefined,
        breakfast: booleanValue(rowValue(row, ["Ontbijt"])),
        kitchen: booleanValue(rowValue(planningRow, ["Keuken"])),
        pool: booleanValue(rowValue(planningRow, ["Zwembad"])),
      };
      const accommodation: Accommodation = {
        id: `excel-accommodation-${index + 1}`,
        name,
        checkIn,
        checkOut: checkOut || checkIn,
        bookingReference: bookingReference || undefined,
        boekingsnummer: bookingReference || undefined,
        address: address || undefined,
        adres: address || undefined,
        location: timelineDay?.plaats,
        city: timelineDay?.plaats,
        stad: timelineDay?.plaats,
        country: timelineDay?.land || countryForDate(checkIn),
        land: timelineDay?.land || countryForDate(checkIn),
        phone: phone || undefined,
        telefoon: phone || undefined,
        price: price || undefined,
        prijsEur: price || undefined,
        currency: price ? "EUR" : undefined,
        checkInTime: excelTimeToText(rowValue(row, ["inchecken (tijd)", "Inchecktijd"])),
        checkOutTime: excelTimeToText(rowValue(row, ["uitchecken (tijd)", "Uitchecktijd"])),
        gps: timelineDay?.gps || gpsFor(`${name} ${address}`),
        features,
      };
      return [accommodation];
    });
    accommodations.forEach((accommodation) => {
      timeline.forEach((day) => {
        if (day.date >= accommodation.checkIn && day.date < accommodation.checkOut) {
          day.accommodatieId = accommodation.id;
          day.overnachting = accommodation.name;
        }
      });
    });
    return accommodations;
  }

  const grouped: Accommodation[] = [];
  let start = 0;
  while (start < timeline.length) {
    const name = timeline[start].overnachting;
    let end = start;
    while (end + 1 < timeline.length && timeline[end + 1].overnachting === name) end += 1;
    if (name && name !== "Nog invullen") {
      const rows = sourceRows.slice(start, end + 1);
      const total = rows.reduce((sum, row) => sum + numberValue(rowValue(row, ["Kosten"])), 0);
      const firstRow = rows[0] || {};
      const bookedAt = normalize(rowValue(firstRow, ["Geboekt bij"]));
      const website = normalize(rowValue(firstRow, ["Website", "Link", "URL"]));
      const features = timeline[start].accommodationFeatures || {
        booked: booleanValue(rowValue(firstRow, ["Geboekt"])),
        cancellable: booleanValue(rowValue(firstRow, ["Annuleren", "Annuleerbaar"])),
        paid: booleanValue(rowValue(firstRow, ["Betaald"])),
        bookedVia: bookedAt || undefined,
        breakfast: booleanValue(rowValue(firstRow, ["Ontbijt"])),
        kitchen: booleanValue(rowValue(firstRow, ["Keuken"])),
        pool: booleanValue(rowValue(firstRow, ["Zwembad"])),
      };
      const isUrl = /^https?:\/\//i.test(name);
      const resolvedWebsite = website || (isUrl ? name : "");
      const importedAddress = isUrl ? "" : (name.includes(",") ? name : "");
      const accommodationGps = timeline[start].gps;
      grouped.push({
        id: `excel-accommodation-${grouped.length + 1}`,
        name: isUrl ? `Verblijf ${timeline[start].plaats}` : name,
        foto: "",
        adres: importedAddress,
        address: importedAddress,
        location: timeline[start].plaats,
        telefoon: "",
        phone: "",
        email: "",
        website: resolvedWebsite || undefined,
        checkIn: timeline[start].date,
        checkOut: end + 1 < timeline.length ? timeline[end + 1].date : timeline[end].date,
        prijsEur: total,
        price: total || undefined,
        currency: total ? "EUR" : undefined,
        boekingsnummer: "",
        mapsUrl: "",
        wifiCode: "",
        bijzonderheden: "",
        land: timeline[start].land,
        stad: timeline[start].plaats,
        gps: accommodationGps,
        features,
      });
    }
    start = end + 1;
  }
  return grouped;
}

interface BudgetActivitySourceRow {
  label: string;
  amountEur: number;
  paid: boolean;
  selected: boolean;
  website?: string;
  country: string;
  source: string;
}

const BUDGET_ACTIVITY_COUNTRIES = new Map<string, string>([
  ["amerika", "Verenigde Staten"],
  ["fiji", "Fiji"],
  ["australie", "Australië"],
  ["nieuwzeeland", "Nieuw-Zeeland"],
  ["thailand", "Thailand"],
  ["tanzania", "Tanzania"],
]);

function budgetActivityRows(workbook: XLSX.WorkBook): BudgetActivitySourceRow[] {
  const sheetName = findSheet(workbook.SheetNames, ["Budget"]);
  if (!sheetName) return [];
  const rows = rawRowsFormatted(workbook, sheetName);
  const start = rows.findIndex((row) => row.some((cell) => /kosten excursies en activiteiten/i.test(normalize(cell))));
  if (start < 0) return [];
  let country = "Onbekend";
  const result: BudgetActivitySourceRow[] = [];

  for (let rowIndex = start + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const label = normalize(row[0]);
    if (/^totaal\s+a(?:t)?tracties/i.test(label)) break;
    if (!label) continue;
    const headingCountry = BUDGET_ACTIVITY_COUNTRIES.get(compact(label));
    if (headingCountry) {
      country = headingCountry;
      continue;
    }
    if (/^(betaald|al gekocht)$/i.test(label)) continue;

    const rawAmount = row[3];
    const selected = yes(row[2]);
    const paid = yes(row[4]);
    const website = normalize(row[6]);
    const hasActivityData = typeof rawAmount === "number" || normalize(rawAmount) !== "" || selected || paid || Boolean(website);
    if (!hasActivityData) continue;
    result.push({
      label,
      amountEur: numberValue(rawAmount),
      paid,
      selected,
      website: website || undefined,
      country,
      source: `${sheetName}!A${rowIndex + 1}:G${rowIndex + 1}`,
    });
  }
  return result;
}

const AIRPORT_CODES: Record<string, string> = {
  amsterdam: "AMS",
  londenheathrow: "LHR",
  londonheathrow: "LHR",
  sanfransisco: "SFO",
  sanfrancisco: "SFO",
  fiji: "NAN",
  nadi: "NAN",
  brisbane: "BNE",
  cairns: "CNS",
  sydney: "SYD",
  melbourne: "MEL",
  christchurch: "CHC",
  auckland: "AKL",
  singapore: "SIN",
  phuket: "HKT",
  doha: "DOH",
  tanzania: "JRO",
  kilimanjaro: "JRO",
};

const airportCode = (value: string) => {
  const key = compact(value);
  return AIRPORT_CODES[key] || Object.entries(AIRPORT_CODES).find(([alias]) => alias.length >= 4 && key.includes(alias))?.[1] || "";
};

function parseBudgetFlights(workbook: XLSX.WorkBook): { flights: Flight[]; carRentals: CarRentalDetails[]; expenses: ExpenseItem[] } {
  const sheetName = findSheet(workbook.SheetNames, ["Budget"]);
  if (!sheetName) return { flights: [], carRentals: [], expenses: [] };
  const rows = rawRowsFormatted(workbook, sheetName);
  const headerIndex = rows.findIndex((row) => {
    const keys = row.map(compact);
    return keys.includes("datum") && keys.includes("van") && keys.includes("naar") && keys.includes("kosten");
  });
  if (headerIndex < 0) return { flights: [], carRentals: [], expenses: [] };
  const headers = rows[headerIndex].map(compact);
  const dateColumn = headers.indexOf("datum");
  const fromColumn = headers.indexOf("van");
  const toColumn = headers.indexOf("naar");
  const amountColumn = headers.indexOf("kosten");
  const flights: Flight[] = [];
  const expenses: ExpenseItem[] = [];

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const date = excelDateToIso(row[dateColumn]);
    const from = normalize(row[fromColumn]);
    const to = normalize(row[toColumn]).replace(/\)$/g, "");
    if (/^totaal$/i.test(to) || (!date && !from && !to)) break;
    if (!date || !from || !to) continue;
    const amount = numberValue(row[amountColumn]);
    const fromCode = airportCode(from);
    const toCode = airportCode(to);
    const flight: Flight = {
      id: `excel-budget-flight-${flights.length + 1}`,
      airline: "Nog invullen",
      flightNumber: "Nog invullen",
      fromCity: from,
      fromCode,
      toCity: to,
      toCode,
      departureAirport: fromCode,
      arrivalAirport: toCode,
      departureDate: date,
      departureTime: "Nog invullen",
      arrivalTime: "Nog invullen",
      bookingReference: "",
      price: amount || undefined,
      costEur: amount || undefined,
      currency: "EUR",
      status: "Gepland",
      delayMinutes: 0,
      source: `${sheetName}!J${rowIndex + 1}:O${rowIndex + 1}`,
    };
    flights.push(flight);
    if (amount) {
      expenses.push({
        id: `excel-budget-flight-expense-${expenses.length + 1}`,
        date,
        category: "vluchten",
        description: `Vlucht ${from} → ${to}`,
        amountOriginal: amount,
        currency: "EUR",
        amountEur: amount,
        country: countryForDate(date),
        paidBy: "Gezin",
      });
    }
  }
  return { flights, carRentals: [], expenses };
}

function parseFlights(workbook: XLSX.WorkBook, warnings: string[]): { flights: Flight[]; carRentals: CarRentalDetails[]; expenses: ExpenseItem[] } {
  const sheetName = findSheet(workbook.SheetNames, ["Vluchten en vervoer"]);
  if (!sheetName) return parseBudgetFlights(workbook);
  const rows = rawRowsFormatted(workbook, sheetName);

  type Block = { title: string; headers: string[]; rows: unknown[][] };
  const blocks: Block[] = [];
  let currentTitle = "";
  let current: Block | null = null;
  const isHeaderRow = (row: unknown[]) => {
    const keys = row.map(compact);
    return keys.some((key) => key.includes("datum")) && keys.filter(Boolean).length >= 3;
  };

  rows.forEach((row) => {
    const nonEmpty = row.map(normalize).filter(Boolean);
    if (nonEmpty.length === 1 && !isHeaderRow(row)) {
      currentTitle = nonEmpty[0];
      current = null;
      return;
    }
    if (isHeaderRow(row)) {
      current = { title: currentTitle, headers: row.map((cell, i) => normalize(cell) || `col${i}`), rows: [] };
      blocks.push(current);
      return;
    }
    if (current && row.some((cell) => normalize(cell) !== "")) current.rows.push(row);
  });

  const flights: Flight[] = [];
  const carRentals: CarRentalDetails[] = [];
  const expenses: ExpenseItem[] = [];
  let flightCounter = 0;
  let rentalCounter = 0;
  let expenseCounter = 0;

  blocks.forEach((block) => {
    const dataRows: Row[] = block.rows.map((values) => Object.fromEntries(block.headers.map((header, i) => [header, values[i]])));
    const headerKeys = block.headers.map(compact);
    const isRentalBlock = headerKeys.some((h) => h.includes("ophaaldatum")) || compact(block.title).includes("autoencamperhuur");
    const isFlightBlock = !isRentalBlock && (
      (headerKeys.some((h) => h === "van") && headerKeys.some((h) => h === "naar")) ||
      compact(block.title).includes("vliegtickets")
    );

    if (isFlightBlock) {
      dataRows.forEach((row) => {
        const date = excelDateToIso(rowValue(row, ["Vertrek datum", "Datum", "reis datum vertrek"]));
        const from = normalize(rowValue(row, ["Van", "Vertrek locatie", "Ophaal locatie"]));
        const to = normalize(rowValue(row, ["Naar", "Aankomst locatie", "Inlever locatie"]));
        if (!date || !from || !to) return;
        const flightNumberRaw = normalize(rowValue(row, ["Vlucht Nummer", "Vlucht nummer", "Vluchtnummer"]));
        const flightMatch = flightNumberRaw.match(/\b([A-Z]{2,3})\s?([0-9]{2,4})\b/i);
        const airline = flightMatch?.[1]?.toUpperCase() || "Nog invullen";
        const flightNumber = flightMatch ? `${flightMatch[1].toUpperCase()} ${flightMatch[2]}` : (flightNumberRaw || "Nog invullen");
        flightCounter += 1;
        const amount = numberValue(rowValue(row, ["Kosten", "Prijs", "Bedrag"]));
        const currency = normalize(rowValue(row, ["Valuta", "Munteenheid"])) || "EUR";
        const bookingReference = normalize(rowValue(row, [
          "Boekingsnummer",
          "Boekings nummer",
          "Reserveringsnummer",
          "Reserverings nummer",
          "Bevestigingsnummer",
        ]));
        flights.push({
          id: `excel-flight-${flightCounter}`,
          airline,
          flightNumber,
          fromCity: from,
          fromCode: normalize(rowValue(row, ["Van code", "Vertrekcode", "Luchthavencode van"])) || airportCode(from),
          toCity: to,
          toCode: normalize(rowValue(row, ["Naar code", "Aankomstcode", "Luchthavencode naar"])) || airportCode(to),
          departureTime: excelTimeToText(rowValue(row, ["Vertrek tijd", "Vertrektijd"])) || "Nog invullen",
          arrivalTime: excelTimeToText(rowValue(row, ["Aankomst tijd", "Aankomst rijd", "Aankomsttijd"])) || "Nog invullen",
          departureDate: date,
          arrivalDate: excelDateToIso(rowValue(row, ["Aankomst datum", "Aankomstdatum"])) || date,
          terminal: normalize(rowValue(row, ["Terminal"])),
          gate: normalize(rowValue(row, ["Gate", "Poort"])),
          seat: normalize(rowValue(row, ["Stoelen", "Stoel"])),
          baggage: normalize(rowValue(row, ["Bagage", "Ruimbagage", "Handbagage"])),
          bookingReference,
          price: amount || undefined,
          currency,
          qrCodeText: "",
          status: "Op tijd",
          delayMinutes: 0,
        });
        if (amount) {
          expenseCounter += 1;
          expenses.push({ id: `excel-flight-expense-${expenseCounter}`, date, category: "vluchten", description: `Vlucht ${from} → ${to}`, amountOriginal: amount, currency: "EUR", amountEur: amount, country: countryForDate(date), paidBy: "Gezin" });
        }
      });
      return;
    }

    if (isRentalBlock) {
      dataRows.forEach((row) => {
        if (Object.values(row).some((cell) => compact(cell) === "totaal")) return;
        const pickupDate = excelDateToIso(rowValue(row, ["Ophaal datum", "Ophaaldatum", "Startdatum"]));
        let returnDate = excelDateToIso(rowValue(row, ["Inlever datum", "Inleverdatum", "Einddatum"]));
        if (pickupDate && returnDate && returnDate < pickupDate) {
          const corrected = `${pickupDate.slice(0, 4)}-${returnDate.slice(5)}`;
          if (corrected >= pickupDate) returnDate = corrected;
        }
        const pickupLocation = normalize(rowValue(row, ["Ophaal locatie", "Ophaallocatie", "Van"]));
        const returnLocation = normalize(rowValue(row, ["Inlever locatie", "Inleverlocatie", "Naar"]));
        const amount = numberValue(rowValue(row, ["Kosten", "Prijs", "Totaalprijs", "Bedrag"]));
        const currency = normalize(rowValue(row, ["Valuta", "Munteenheid"])) || "EUR";
        const reservationRaw = normalize(rowValue(row, ["Reserverings nummer", "Reserveringsnummer", "Boekingsnummer", "Bevestigingsnummer"]));
        const extra = normalize(rowValue(row, ["Overige", "Gegevens", "Notities", "Opmerking"]));
        const reservation = /^[\d.]+$/.test(reservationRaw) ? reservationRaw.replace(/\./g, "") : reservationRaw;
        const companySource = `${extra} ${pickupLocation} ${returnLocation}`;
        const company = normalize(rowValue(row, ["Verhuurder", "Maatschappij", "Bedrijf", "Aanbieder"])) || companySource.match(/\b(Budget|Hertz|Bargain Car Rentals|Sixt|Snap Rentals)\b/i)?.[1] || "Nog invullen";
        const model = normalize(rowValue(row, ["Auto", "Model", "Voertuig", "Categorie", "Autotype"])) || extra.split(",")[0]?.trim();
        const inferredPhone = extra.match(/(?:tel\.?|telefoon)\s*[:.]?\s*(\+?[\d\s()-]+)/i)?.[1]?.trim();
        if (!pickupLocation && !returnLocation && !amount && !company) return;
        rentalCounter += 1;
        carRentals.push({
          id: `excel-rental-${rentalCounter}`,
          modelName: model || `Huurauto ${rentalCounter}`,
          category: normalize(rowValue(row, ["Categorie", "Voertuigcategorie"])) || "Huurauto",
          company,
          ophaallocatie: pickupLocation || "Nog invullen",
          pickupLocation: pickupLocation || "Nog invullen",
          inleverlocatie: returnLocation || "Nog invullen",
          dropoffLocation: returnLocation || "Nog invullen",
          returnLocation: returnLocation || "Nog invullen",
          ophaaldatum: pickupDate,
          pickupDate,
          inleverdatum: returnDate,
          dropoffDate: returnDate,
          returnDate,
          pickupTime: excelTimeToText(rowValue(row, ["Ophaal tijd", "Ophaaltijd", "Starttijd"])),
          returnTime: excelTimeToText(rowValue(row, ["Inlever tijd", "Inlevertijd", "Eindtijd"])),
          bookingReference: reservation || undefined,
          totalPrice: amount || undefined,
          currency,
          dagprijsEur: 0,
          brandstofverbruikLPer100Km: numberValue(rowValue(row, ["Verbruik", "Brandstofverbruik", "L/100 km", "L per 100 km"])),
          verzekeringInfo: normalize(rowValue(row, ["Verzekering", "Verzekeringsinformatie", "Dekking"])),
          kenteken: normalize(rowValue(row, ["Kenteken", "Registratie"])),
          vehicleType: normalize(rowValue(row, ["Autotype", "Voertuigtype", "Klasse"])),
          transmission: normalize(rowValue(row, ["Transmissie", "Versnelling"])),
          fuelType: normalize(rowValue(row, ["Brandstof", "Brandstoftype"])),
          fuelPolicy: normalize(rowValue(row, ["Tankregeling", "Brandstofbeleid", "Fuel policy"])),
          seats: numberValue(rowValue(row, ["Zitplaatsen", "Aantal zitplaatsen"])) || undefined,
          deposit: numberValue(rowValue(row, ["Borg", "Waarborg"])) || undefined,
          excess: numberValue(rowValue(row, ["Eigen risico", "Eigenrisico"])) || undefined,
          phone: normalize(rowValue(row, ["Telefoon", "Telefoonnummer"])) || inferredPhone,
          website: normalize(rowValue(row, ["Website", "Link", "URL"])),
          notes: extra || undefined,
          hotelBudgetPerNachtEur: 0,
        });
        if (amount) {
          expenseCounter += 1;
          expenses.push({ id: `excel-rental-expense-${expenseCounter}`, date: pickupDate, category: "vervoer", description: `${company !== "Nog invullen" ? company : "Huurauto"} · ${pickupLocation} → ${returnLocation}`, amountOriginal: amount, currency, amountEur: currency === "EUR" ? amount : 0, country: pickupDate ? countryForDate(pickupDate) : "Onbekend", paidBy: "Gezin" });
        }
      });
      return;
    }

    dataRows.forEach((row) => {
      const amount = numberValue(rowValue(row, ["Kosten"]));
      if (!amount || Object.values(row).some((cell) => compact(cell) === "totaal")) return;
      const date = excelDateToIso(rowValue(row, ["reis datum vertrek", "Vertrek datum", "Datum"]));
      const from = normalize(rowValue(row, ["Vertrek locatie", "Van"]));
      const to = normalize(rowValue(row, ["Aankomst locatie", "Naar"]));
      expenseCounter += 1;
      expenses.push({ id: `excel-transport-expense-${expenseCounter}`, date, category: "vervoer", description: [block.title, from && `${from} → ${to}`].filter(Boolean).join(" · ") || "Overig vervoer", amountOriginal: amount, currency: "EUR", amountEur: amount, country: date ? countryForDate(date) : "Onbekend", paidBy: "Gezin" });
    });
  });

  if (!flights.length) warnings.push("Geen geldige vluchtregels gevonden in ‘Vluchten en vervoer’.");
  return { flights, carRentals, expenses };
}
function parseChecklist(workbook: XLSX.WorkBook): ChecklistItem[] {
  const sheetName = findSheet(workbook.SheetNames, ["To Do"]);
  if (!sheetName) return [];
  const rows = rowsFromSheet(workbook, sheetName);
  return rows.flatMap((row, index) => {
    const task = normalize(rowValue(row, ["Taak", "To-do", "Todo"]));
    if (!task) return [];
    const details = normalize(rowValue(row, ["Details/Notities", "Details", "Notities"]));
    const destination = normalize(rowValue(row, ["Bestemming", "Land"]));
    return [{
      id: `excel-check-${index + 1}`,
      text: details ? `${task} — ${details}` : task,
      category: destination ? "country-transition" : "pre-departure",
      countryScope: destination || undefined,
      completed: yes(rowValue(row, ["Status", "Status.1"])),
    } satisfies ChecklistItem];
  });
}

function parseInsurance(workbook: XLSX.WorkBook): DocumentItem[] {
  const sheetName = findSheet(workbook.SheetNames, ["Verzekeringen"]);
  if (!sheetName) return [];
  const rows = rawRows(workbook, sheetName);
  const documents: DocumentItem[] = [];
  rows.forEach((row, index) => {
    const title = normalize(row[0]);
    if (!title || compact(title).includes("typeverzekering") || compact(title) === "totaal" || compact(title).includes("kostenverzekeringen")) return;
    const amount = numberValue(row[1]);
    const provider = normalize(row[2]);
    const policyNumber = normalize(row[3]);
    documents.push({
      id: `excel-insurance-${index + 1}`,
      titel: title,
      categorie: "Verzekering",
      bestandsnaam: "",
      fileType: "pdf",
      uploadDatum: new Date().toISOString().slice(0, 10),
      verzekeraar: provider || undefined,
      maatschappij: provider || undefined,
      polisnummer: policyNumber || undefined,
      prijs: amount || undefined,
      notes: "",
    });
  });
  return documents;
}

// Normalises country-header text found in free-form sheets (e.g. "Nieuw Zeeland" without a
// hyphen) to the exact country strings used elsewhere in the app (from countryForDate/FLAG), so
// activities always match when views filter by land. Without this, a spelling difference makes
// a whole country's activities invisible in land-filtered views even though they did import.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  amerika: "Verenigde Staten",
  usa: "Verenigde Staten",
  "verenigde staten": "Verenigde Staten",
  fiji: "Fiji",
  australie: "Australië",
  "australië": "Australië",
  "nieuw zeeland": "Nieuw-Zeeland",
  "nieuw-zeeland": "Nieuw-Zeeland",
  singapore: "Singapore",
  thailand: "Thailand",
  qatar: "Qatar",
  tanzania: "Tanzania",
};
const normalizeCountryName = (value: string): string => COUNTRY_NAME_ALIASES[value.toLowerCase()] || value;


function parsePackingList(workbook: XLSX.WorkBook): PackingItem[] {
  const sheetName = findSheet(workbook.SheetNames, ["Paklijst"]);
  if (!sheetName) return [];

  const rows = rawRows(workbook, sheetName);
  const items: PackingItem[] = [];
  const people = [
    { id: "packing-bas", name: "Bas" },
    { id: "packing-maartje", name: "Maartje" },
    { id: "packing-liz", name: "Liz" },
    { id: "packing-isa", name: "Isa" },
  ];
  let targets = [{ id: "packing-general", name: "Algemeen" }];
  let category = "Documenten & administratie";
  let duplicateForEveryone = false;
  const personalCategories = new Map([
    ["kleding", "Kleding"], ["jassenvesten", "Jassen & Vesten"], ["ondergoed", "Ondergoed"],
    ["zwemmen", "Zwemmen"], ["sport", "Sport"], ["schoenen", "Schoenen"],
  ]);

  const addItem = (text: string, index: number) => {
    targets.forEach((target) => items.push({
      id: `excel-pack-${index + 1}-${target.id}`,
      item: text,
      text,
      category,
      categorie: category,
      subcategory: "Algemeen",
      subcategorie: "Algemeen",
      status: "Inpakken",
      personId: target.id,
      person: target.name,
      toegewezenAan: target.name,
      bron: `${sheetName}!A${index + 1}`,
    }));
  };

  rows.forEach((row, index) => {
    const text = normalize(row[0]);
    if (!text) return;
    const key = compact(text);
    if (key === "documentenadministratie") { targets = [{ id: "packing-general", name: "Algemeen" }]; category = "Documenten & administratie"; duplicateForEveryone = false; return; }
    if (key === "perpersoon") { targets = people; category = "Documenten & administratie"; duplicateForEveryone = true; return; }
    if (key === "gezamenlijk") { targets = [{ id: "packing-general", name: "Algemeen" }]; duplicateForEveryone = false; return; }
    if (key === "man") { targets = [people[0]]; category = "Kleding"; duplicateForEveryone = false; return; }
    if (key === "vrouw") { targets = [people[1]]; category = "Kleding"; duplicateForEveryone = false; return; }
    if (key === "meiden810jaar") return;
    if (key === "kledingkind10") { targets = [people[2]]; category = "Kleding"; duplicateForEveryone = false; return; }
    if (key === "kledingkind8") { targets = [people[3]]; category = "Kleding"; duplicateForEveryone = false; return; }
    if (key === "toilettas") { targets = people; category = "Toilettas"; duplicateForEveryone = true; return; }
    if (key === "ehbo") { targets = [{ id: "packing-general", name: "Algemeen" }]; category = "EHBO"; duplicateForEveryone = false; return; }
    if (key === "elektronica") { targets = [{ id: "packing-general", name: "Algemeen" }]; category = "Elektronica"; duplicateForEveryone = false; return; }
    if (key === "overige") { targets = [{ id: "packing-general", name: "Algemeen" }]; category = "Overige"; duplicateForEveryone = false; return; }
    if (key === "spullenkinderen") { targets = [{ id: "packing-children", name: "Spullen kinderen" }]; category = "Spullen kinderen"; duplicateForEveryone = false; return; }
    const personalCategory = personalCategories.get(key);
    if (personalCategory && !duplicateForEveryone) { category = personalCategory; return; }
    addItem(text, index);
  });

  return items;
}

function parseEmergencies(workbook: XLSX.WorkBook): EmergencyCountryProfile[] {
  const sheetName = findSheet(workbook.SheetNames, ["Noodnummers", "Noodnummers & SOS"]);
  if (!sheetName) return [];
  const headerRow = detectHeaderRow(workbook, sheetName, ["Land", "Algemeen alarm"]);
  return rowsFromSheetFormatted(workbook, sheetName, headerRow).flatMap((row, index) => {
    const country = normalize(rowValue(row, ["Land"]));
    if (!country || /^gecontroleerd/i.test(country)) return [];
    return [{
      id: `excel-emergency-${compact(country) || index + 1}`,
      country: normalizeCountryName(country),
      flag: FLAG[normalizeCountryName(country)] || "🌍",
      generalEmergency: normalize(rowValue(row, ["Algemeen alarm"])),
      police: normalize(rowValue(row, ["Politie"])),
      ambulance: normalize(rowValue(row, ["Ambulance"])),
      fireDepartment: normalize(rowValue(row, ["Brandweer"])),
      embassyName: normalize(rowValue(row, ["Ambassade / consulaat", "Ambassade / Consulaat"])),
      netherlandsWorldwide: normalize(rowValue(row, ["Nederland Wereldwijd"])),
      medicalHelp: normalize(rowValue(row, ["Ziekenhuis / medische hulp"])),
      nearestHospital: normalize(rowValue(row, ["Ziekenhuis / medische hulp"])),
      specialIsis: normalize(rowValue(row, ["Special ISIS"])),
      insurerEmergencyPhone: normalize(rowValue(row, ["Special ISIS"])),
      czHelpline: normalize(rowValue(row, ["CZ Helpline"])),
      important: normalize(rowValue(row, ["Belangrijk"])),
      notes: normalize(rowValue(row, ["Belangrijk"])),
      source: `${sheetName}!A${headerRow + index + 2}:K${headerRow + index + 2}`,
    } satisfies EmergencyCountryProfile];
  });
}

function activityMatchKey(value: unknown): string {
  return compact(value).replace(/\b(de|het|een|the|and|en|tour|ticket|tickets)\b/g, "");
}

function linkActivityToTimeline(activity: ActivityItem, timeline: TimelineDay[]): ActivityItem {
  const key = activityMatchKey(activity.name);
  if (key.length < 4) return activity;

  const candidateDays = activity.date ? timeline.filter((day) => day.date === activity.date) : timeline;
  for (const day of candidateDays) {
    const planItems = day.planItems || [];
    const matchingPlanItem = planItems.find((item) => {
      const haystack = activityMatchKey(`${item.title} ${item.detail || ""}`);
      return haystack.includes(key) || key.includes(haystack);
    });
    if (matchingPlanItem) {
      return {
        ...activity,
        date: day.date,
        time: matchingPlanItem.time,
        endTime: matchingPlanItem.endTime,
        land: day.land || activity.land,
        location: activity.location || matchingPlanItem.location || day.plaats,
        notes: activity.notes || matchingPlanItem.detail,
      };
    }

    const legacyText = activityMatchKey((day.activiteiten || []).join(" "));
    if (legacyText.includes(key)) {
      return {
        ...activity,
        date: day.date,
        land: day.land || activity.land,
        location: activity.location || day.plaats,
      };
    }
  }
  return activity;
}

function parseActivities(workbook: XLSX.WorkBook, timeline: TimelineDay[]): { activities: ActivityItem[]; savedLocations: SavedLocation[]; expenses: ExpenseItem[] } {
  const sheetName = workbook.SheetNames.find((name) => compact(name).startsWith("excursiesenactiv"));
  if (!sheetName) {
    const sourceRows = budgetActivityRows(workbook);
    const activities: ActivityItem[] = [];
    const savedLocations: SavedLocation[] = [];
    const expenses: ExpenseItem[] = [];
    sourceRows.forEach((source, index) => {
      const baseActivity: ActivityItem = {
        id: `excel-budget-activity-${index + 1}`,
        name: source.label,
        land: source.country,
        location: "",
        category: "Excursie / entree",
        booked: source.selected || source.paid,
        paid: source.paid,
        currency: "EUR",
        ticketsUrl: source.website,
        priceEur: source.amountEur,
        rating: 0,
        photos: [],
        kidFriendlyScore: 3,
        durationHours: 0,
        description: "Overgenomen uit het budgettabblad",
        source: source.source,
      };
      const activity = linkActivityToTimeline(baseActivity, timeline);
      activities.push(activity);
      if (source.website) {
        savedLocations.push({
          id: `excel-budget-location-${index + 1}`,
          naam: source.label,
          adres: "",
          website: source.website,
          gps: gpsFor(source.label),
          kostenEur: source.amountEur || undefined,
          notities: "Overgenomen uit het budgettabblad",
          rating: 0,
          category: "sight",
        });
      }
      if (source.paid && source.amountEur) {
        expenses.push({
          id: `excel-budget-activity-expense-${index + 1}`,
          date: activity.date || "",
          category: "activiteiten",
          description: source.label,
          amountOriginal: source.amountEur,
          currency: "EUR",
          amountEur: source.amountEur,
          country: activity.land || source.country,
          paidBy: "Gezin",
        });
      }
    });
    return { activities, savedLocations, expenses };
  }
  const headerRow = detectHeaderRow(workbook, sheetName, ["Betaald"]);
  const rows = rowsFromSheetFormatted(workbook, sheetName, headerRow);
  let currentCountry = "Onbekend";
  const activities: ActivityItem[] = [];
  const savedLocations: SavedLocation[] = [];
  const expenses: ExpenseItem[] = [];

  rows.forEach((row, index) => {
    const name = normalize(rowValue(row, ["Kosten excursies en activiteiten", "Activiteit", "Naam", "Omschrijving"]));
    if (!name) return;

    // Nieuwe werkmap: A naam, B kosten, C betaald, D geboekt, E datum, F adres, G website.
    // De aliassen houden ook oudere werkmappen importeerbaar.
    const amount = numberValue(rowValue(row, ["Kosten", "Bedrag", "Prijs", "col1"]) ?? Object.values(row)[1]);
    const paidText = normalize(rowValue(row, ["Betaald"]));
    const bookedText = normalize(rowValue(row, ["Geboekt"]));
    const date = excelDateToIso(rowValue(row, ["Datum"]));
    const address = normalize(rowValue(row, ["Adres", "Locatie"]));
    const website = normalize(rowValue(row, ["Website", "URL", "Link"]));

    if (/^totaal|^betaald$/i.test(name)) return;
    const looksLikeCountryHeading = !amount && !paidText && !bookedText && !date && !address && !website;
    if (looksLikeCountryHeading) {
      currentCountry = normalizeCountryName(name);
      return;
    }

    const paid = yes(paidText);
    const booked = yes(bookedText);
    const baseActivity: ActivityItem = {
      id: `excel-activity-${index + 1}`,
      name,
      land: currentCountry,
      location: address,
      category: "Excursie / entree",
      date: date || undefined,
      booked,
      paid,
      currency: "EUR",
      ticketsUrl: website || undefined,
      website: website || undefined,
      address: address || undefined,
      bookingRef: undefined,
      openingHours: "",
      priceEur: amount,
      rating: 0,
      photos: [],
      kidFriendlyScore: 3,
      durationHours: 0,
      description: "",
    };
    const activity = linkActivityToTimeline(baseActivity, timeline);
    const addressGps = gpsFor(`${name} ${address}`);
    activity.gps = addressGps.lat !== 0 ? addressGps : timeline.find((day) => day.date === activity.date)?.gps;
    activities.push(activity);

    if (address || website) {
      savedLocations.push({
        id: `excel-location-${index + 1}`,
        naam: name,
        adres: address,
        website: website || undefined,
        gps: gpsFor(`${name} ${address}`),
        kostenEur: amount || undefined,
        notities: [booked ? "Geboekt" : "", paid ? "Betaald" : ""].filter(Boolean).join(" · "),
        rating: 0,
        category: "sight",
      });
    }
    if (amount && paid) {
      expenses.push({
        id: `excel-activity-expense-${index + 1}`,
        date: activity.date || "",
        category: "activiteiten",
        description: name,
        amountOriginal: amount,
        currency: "EUR",
        amountEur: amount,
        country: activity.land || currentCountry,
        paidBy: "Gezin",
      });
    }
  });
  return { activities, savedLocations, expenses };
}

// Sums a "totals per country" side-table (e.g. Land | Aantal dagen | Dagbudget | Totaal per
// land) that a plain label/amount scan can't read because the row label is a country name, not
// a recognisable category keyword. Finds the "Totaal per land" header, then reads the adjacent
// country-name column downward, stopping as soon as that column goes blank so it never wanders
// into an unrelated table further down the sheet that happens to reuse the same columns.
function sumTotalPerLandColumn(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i += 1) {
    const totalColIndex = rows[i].findIndex((cell) => compact(cell) === "totaalperland");
    if (totalColIndex < 0) continue;
    const landColIndex = totalColIndex - 3; // Land | Aantal dagen | Dagbudget | Totaal per land
    let sum = 0;
    for (let r = i + 1; r < rows.length; r += 1) {
      const land = normalize(rows[r][landColIndex]);
      if (!land) break;
      sum += numberValue(rows[r][totalColIndex]);
    }
    return sum;
  }
  return 0;
}

function parseBudget(workbook: XLSX.WorkBook, planningRows: Row[], flightExpenses: ExpenseItem[], activityExpenses: ExpenseItem[]) {
  const sheetName = findSheet(workbook.SheetNames, ["Budget"]);
  const rows = sheetName ? rawRows(workbook, sheetName) : [];
  const budgetSheet = sheetName ? workbook.Sheets[sheetName] : undefined;

  const amountRightOf = (label: RegExp, startCol = 0, endCol = 15): number => {
    for (const row of rows) {
      for (let column = startCol; column <= Math.min(endCol, row.length - 1); column += 1) {
        if (typeof row[column] !== "string" || !label.test(normalize(row[column]))) continue;
        for (let valueColumn = column + 1; valueColumn <= Math.min(endCol, row.length - 1); valueColumn += 1) {
          const amount = numberValue(row[valueColumn]);
          if (amount || row[valueColumn] === 0) return amount;
        }
      }
    }
    return 0;
  };

  const linesBetween = (labelCol: number, amountCol: number, startRow: number, endRow: number) => {
    const result: Array<{ label: string; amountEur: number; source: string; rowIndex: number }> = [];
    for (let rowIndex = startRow; rowIndex <= Math.min(endRow, rows.length - 1); rowIndex += 1) {
      const label = normalize(rows[rowIndex]?.[labelCol]);
      const amount = numberValue(rows[rowIndex]?.[amountCol]);
      if (!label || /^totaal$/i.test(label)) continue;
      if (amount || rows[rowIndex]?.[amountCol] === 0) {
        result.push({
          label,
          amountEur: amount,
          source: `${sheetName || "Budget"}!${XLSX.utils.encode_col(labelCol)}${rowIndex + 1}:${XLSX.utils.encode_col(amountCol)}${rowIndex + 1}`,
          rowIndex,
        });
      }
    }
    return result;
  };

  const formulaRangeCount = (rowIndex: number, columnIndex: number) => {
    const cell = budgetSheet?.[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
    const cached = numberValue(cell?.v);
    if (cached) return cached;
    const range = cell?.f?.match(/[A-Z]+(\d+):[A-Z]+(\d+)/i);
    return range ? Number(range[2]) - Number(range[1]) + 1 : 0;
  };

  const sumPlanningCostsFromFormula = (rowIndex: number, columnIndex: number, fallbackRows = planningRows.length) => {
    const cell = budgetSheet?.[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
    const range = cell?.f?.match(/I(\d+):I(\d+)/i);
    const start = range ? Math.max(0, Number(range[1]) - 2) : 0;
    const end = range ? Math.min(planningRows.length, Number(range[2]) - 1) : Math.min(planningRows.length, fallbackRows);
    return planningRows.slice(start, end).reduce((sum, row) => sum + numberValue(rowValue(row, ["Kosten"])), 0);
  };

  const plannedDaysForBudgetCountry = (budgetCountry: string): number => {
    const maxima = new Map<string, number>();
    const positiveCounts = new Map<string, number>();
    planningRows.forEach((row) => {
      const date = excelDateToIso(rowValue(row, ["Datum"]));
      const country = date ? countryForDate(date) : "";
      const dayNumber = numberValue(rowValue(row, ["aantal dagen", "Dag"]));
      if (country && dayNumber > 0) {
        maxima.set(country, Math.max(maxima.get(country) || 0, dayNumber));
        positiveCounts.set(country, (positiveCounts.get(country) || 0) + 1);
      }
    });
    const key = compact(budgetCountry);
    if (key === "usa") return positiveCounts.get("Verenigde Staten") || 0;
    if (key.includes("thailandsindoha")) {
      return ["Thailand", "Singapore", "Qatar"].reduce((sum, country) => sum + (maxima.get(country) || 0), 0);
    }
    if (key === "tanzania") {
      const statedDays = rows
        .filter((row) => compact(row?.[9]) === "tanzania")
        .reduce((maximum, row) => Math.max(maximum, numberValue(row?.[10])), 0);
      if (statedDays) return statedDays;
    }
    const country = key === "nieuwzeeland" ? "Nieuw-Zeeland" : budgetCountry;
    if (key === "fiji") return maxima.get(country) || 0;
    return positiveCounts.get(country) || maxima.get(country) || 0;
  };

  const monthsOnTrip = amountRightOf(/Aantal maanden op reis/i, 3, 5) || 1;
  const homeMonthlyLines = linesBetween(3, 4, 2, 13);
  const homeMonthlyEur = homeMonthlyLines.reduce((sum, line) => sum + line.amountEur, 0);
  const homeCostsEur = homeMonthlyEur * monthsOnTrip;

  const preparationLines = linesBetween(6, 7, 2, 5);
  const transportLines = linesBetween(6, 7, 8, 15);
  const travelExtraLines = linesBetween(6, 7, 16, 19);
  const upfrontInputLines = [...preparationLines, ...transportLines, ...travelExtraLines];
  const upfrontCostsEur = upfrontInputLines.reduce((sum, line) => sum + line.amountEur, 0);

  const countryDailyBudgets: NonNullable<BudgetDashboardData["countryDailyBudgets"]> = [];
  const foodHeader = rows.findIndex((row) => /maaltijden en boodschappen/i.test(normalize(row?.[9])));
  if (foodHeader >= 0) {
    for (let rowIndex = foodHeader + 1; rowIndex < rows.length; rowIndex += 1) {
      const country = normalize(rows[rowIndex]?.[9]);
      if (!country || /uit eten extra|totaal aantal dagen|accommodatie/i.test(country)) break;
      const days = numberValue(rows[rowIndex]?.[10]) || formulaRangeCount(rowIndex, 10) || plannedDaysForBudgetCountry(country);
      const dailyBudgetEur = numberValue(rows[rowIndex]?.[11]);
      const totalEur = numberValue(rows[rowIndex]?.[12]) || days * dailyBudgetEur;
      if (days || dailyBudgetEur || totalEur) countryDailyBudgets.push({ country, days, dailyBudgetEur, totalEur });
    }
  }

  const extraFoodRow = rows.findIndex((row) => /uit eten extra/i.test(normalize(row?.[9])));
  const extraFoodEur = extraFoodRow >= 0
    ? numberValue(rows[extraFoodRow]?.[12]) || numberValue(rows[extraFoodRow]?.[10]) * numberValue(rows[extraFoodRow]?.[11])
    : 0;
  const foodBudget = countryDailyBudgets.reduce((sum, item) => sum + item.totalEur, 0) + extraFoodEur;

  const accommodationHeader = rows.findIndex((row) => /^accommodatie$/i.test(normalize(row?.[9])));
  const accommodationCostRow = rows.findIndex((row, index) => index > accommodationHeader && /kosten cabin\/hotel/i.test(normalize(row?.[9])));
  const tanzaniaAccommodationRow = rows.findIndex((row, index) => index > accommodationHeader && /^tanzania$/i.test(normalize(row?.[9])));
  const tanzaniaAccommodationDays = tanzaniaAccommodationRow >= 0 ? numberValue(rows[tanzaniaAccommodationRow]?.[10]) : 0;
  const accommodationCoreEur = (accommodationCostRow >= 0 ? numberValue(rows[accommodationCostRow]?.[12]) : 0)
    || sumPlanningCostsFromFormula(accommodationCostRow >= 0 ? accommodationCostRow : 13, 12, planningRows.length - tanzaniaAccommodationDays);
  const tanzaniaAccommodationEur = tanzaniaAccommodationRow >= 0 ? numberValue(rows[tanzaniaAccommodationRow]?.[12]) : 0;
  const accommodationBudget = accommodationCoreEur + tanzaniaAccommodationEur;

  const activitySourceRows = budgetActivityRows(workbook);
  const plannedActivitiesEur = activitySourceRows.reduce((sum, item) => sum + item.amountEur, 0)
    || amountRightOf(/Excursies \(gepland\)/i, 9, 13);
  const unplannedActivitiesEur = amountRightOf(/Excursies \(niet gepland\)/i, 9, 13);
  const activityBudget = plannedActivitiesEur + unplannedActivitiesEur;
  const summaryAmount = (label: RegExp, startRow = 0, endRow = rows.length - 1) => {
    for (let rowIndex = startRow; rowIndex <= Math.min(endRow, rows.length - 1); rowIndex += 1) {
      if (label.test(normalize(rows[rowIndex]?.[0]))) return numberValue(rows[rowIndex]?.[1]);
    }
    return 0;
  };
  const travelCostsEur = summaryAmount(/^Kosten op reis$/i, 0, 8) || foodBudget + accommodationBudget + activityBudget;
  const contingencyEur = summaryAmount(/^Onvoorzien$/i, 0, 8) || amountRightOf(/^Onvoorzien$/i, 0, 2);
  const summaryHomeCostsEur = summaryAmount(/^Kosten van thuis$/i, 0, 8);
  const summaryUpfrontCostsEur = summaryAmount(/^Kosten vooraf$/i, 0, 8);
  const totalNeededEur = summaryAmount(/^Totaal benodigd$/i, 0, 8) || homeCostsEur + upfrontCostsEur + travelCostsEur + contingencyEur;

  const fundingLines = linesBetween(0, 1, 13, 17);
  const fundingTotalEur = summaryAmount(/^Totaal$/i, 13, 18) || fundingLines.reduce((sum, line) => sum + line.amountEur, 0);
  const incomeLines = linesBetween(14, 15, 2, 21).filter((line) => !/totaal|aantal maanden/i.test(line.label));
  const monthlyIncomeEur = incomeLines.reduce((sum, line) => sum + line.amountEur, 0);

  const flightBudget = transportLines.find((line) => /^vliegtickets$/i.test(line.label))?.amountEur || 0;
  const transportBudget = [...transportLines.filter((line) => !/^vliegtickets$/i.test(line.label)), ...travelExtraLines.filter((line) => !/benzine/i.test(line.label))]
    .reduce((sum, line) => sum + line.amountEur, 0);
  const fuelBudget = travelExtraLines.find((line) => /benzine/i.test(line.label))?.amountEur || 0;
  const homeInsuranceLine = homeMonthlyLines.find((line) => /woonhuis \/ reis verzekering/i.test(line.label));
  const cancellationInsuranceLine = preparationLines.find((line) => /annulerings verzekering/i.test(line.label));
  const insuranceBudget = (homeInsuranceLine?.amountEur || 0) * monthsOnTrip + (cancellationInsuranceLine?.amountEur || 0);
  const homeCategoryBudget = homeCostsEur - (homeInsuranceLine?.amountEur || 0) * monthsOnTrip;
  const visaBudget = preparationLines.find((line) => /^visa/i.test(line.label))?.amountEur || 0;
  const preparationBudget = preparationLines
    .filter((line) => !/^visa/i.test(line.label) && !/annulerings verzekering/i.test(line.label))
    .reduce((sum, line) => sum + line.amountEur, 0);

  const accommodationExpenses: ExpenseItem[] = planningRows.flatMap((row, index) => {
    const amount = numberValue(rowValue(row, ["Kosten"]));
    if (!amount || !yes(rowValue(row, ["Betaald"]))) return [];
    const date = excelDateToIso(rowValue(row, ["Datum"]));
    return [{
      id: `excel-hotel-expense-${index + 1}`,
      date,
      category: "hotels",
      description: normalize(rowValue(row, ["Naam"])) || "Accommodatie",
      amountOriginal: amount,
      currency: "EUR",
      amountEur: amount,
      country: countryForDate(date),
      paidBy: "Gezin",
    } satisfies ExpenseItem];
  });
  const expenses = [...accommodationExpenses, ...flightExpenses.filter((item) => item.category === "vluchten"), ...activityExpenses];
  const alreadyPaidEur = summaryAmount(/^Totaal al betaald$/i, 0, 12) || expenses.reduce((sum, expense) => sum + expense.amountEur, 0);
  const paidFlightSummary = summaryAmount(/^Vluchten$/i, 8, 12);
  const paidAccommodationSummary = summaryAmount(/^Accomodatie$/i, 8, 12) || summaryAmount(/^Accommodatie$/i, 8, 12);
  const paidActivitySummary = summaryAmount(/^Excursies$/i, 8, 12);

  const plannedLine = (
    label: string,
    amountEur: number,
    source: string,
    category: ExpenseItem["category"],
    country?: string,
  ): BudgetDashboardLine => ({ label, amountEur, source, category, country, kind: "planned" });

  const categorySourceLines = new Map<ExpenseItem["category"], BudgetDashboardLine[]>([
    ["thuis", homeMonthlyLines
      .filter((line) => line !== homeInsuranceLine)
      .map((line) => plannedLine(`${line.label} (${monthsOnTrip} maanden)`, line.amountEur * monthsOnTrip, line.source, "thuis"))],
    ["vluchten", transportLines
      .filter((line) => /^vliegtickets$/i.test(line.label))
      .map((line) => plannedLine(line.label, line.amountEur, line.source, "vluchten"))],
    ["vervoer", [
      ...transportLines.filter((line) => !/^vliegtickets$/i.test(line.label)),
      ...travelExtraLines.filter((line) => !/benzine/i.test(line.label)),
    ].map((line) => plannedLine(line.label, line.amountEur, line.source, "vervoer"))],
    ["brandstof", travelExtraLines
      .filter((line) => /benzine/i.test(line.label))
      .map((line) => plannedLine(line.label, line.amountEur, line.source, "brandstof"))],
    ["hotels", [
      plannedLine("Kosten cabin/hotel", accommodationCoreEur, `${sheetName || "Budget"}!J14:M14`, "hotels"),
      plannedLine("Tanzania", tanzaniaAccommodationEur, `${sheetName || "Budget"}!J15:M15`, "hotels", "Tanzania"),
    ].filter((line) => line.amountEur > 0)],
    ["boodschappen", [
      ...countryDailyBudgets.map((item, index) => plannedLine(`${item.days} dagen × €${item.dailyBudgetEur}/dag`, item.totalEur, `${sheetName || "Budget"}!J${foodHeader + index + 2}:M${foodHeader + index + 2}`, "boodschappen", item.country)),
      plannedLine("Uit eten extra", extraFoodEur, `${sheetName || "Budget"}!J${extraFoodRow + 1}:M${extraFoodRow + 1}`, "boodschappen"),
    ].filter((line) => line.amountEur > 0)],
    ["activiteiten", [
      ...activitySourceRows.filter((item) => item.amountEur > 0).map((item) => plannedLine(item.label, item.amountEur, item.source, "activiteiten", item.country)),
      plannedLine("Reserve niet-geplande excursies", unplannedActivitiesEur, `${sheetName || "Budget"}!J19:M19`, "activiteiten"),
    ].filter((line) => line.amountEur > 0)],
    ["verzekeringen", [
      homeInsuranceLine ? plannedLine(`${homeInsuranceLine.label} (${monthsOnTrip} maanden)`, homeInsuranceLine.amountEur * monthsOnTrip, homeInsuranceLine.source, "verzekeringen") : undefined,
      cancellationInsuranceLine ? plannedLine(cancellationInsuranceLine.label, cancellationInsuranceLine.amountEur, cancellationInsuranceLine.source, "verzekeringen") : undefined,
    ].filter(Boolean) as BudgetDashboardLine[]],
    ["visa", preparationLines
      .filter((line) => /^visa/i.test(line.label))
      .map((line) => plannedLine(line.label, line.amountEur, line.source, "visa"))],
    ["overig", preparationLines
      .filter((line) => !/^visa/i.test(line.label) && !/annulerings verzekering/i.test(line.label))
      .map((line) => plannedLine(line.label, line.amountEur, line.source, "overig"))],
    ["onvoorzien", [plannedLine("Onvoorzien", contingencyEur, `${sheetName || "Budget"}!A6:B6`, "onvoorzien")]],
  ]);

  const categoryValues: Array<[ExpenseItem["category"], string, number, string]> = [
    ["thuis", "Vaste lasten thuis", homeCategoryBudget, "Home"],
    ["vluchten", "Vliegtickets", flightBudget, "Plane"],
    ["vervoer", "Auto, camper & overig vervoer", transportBudget, "Car"],
    ["brandstof", "Brandstof", fuelBudget, "Fuel"],
    ["hotels", "Accommodaties", accommodationBudget, "Hotel"],
    ["boodschappen", "Maaltijden & boodschappen", foodBudget, "ShoppingCart"],
    ["activiteiten", "Excursies & activiteiten", activityBudget, "Ticket"],
    ["verzekeringen", "Verzekeringen", insuranceBudget, "Shield"],
    ["visa", "Visa & reisdocumenten", visaBudget, "FileText"],
    ["overig", "Uitrusting & voorbereiding", preparationBudget, "Luggage"],
    ["onvoorzien", "Onvoorzien", contingencyEur, "CircleAlert"],
  ];

  const categoryBudgets: CategoryBudget[] = categoryValues
    .filter(([, , budget]) => budget > 0)
    .map(([category, label, budgetEur, iconName]) => ({
      category,
      label,
      budgetEur,
      spentEur: category === "vluchten" && paidFlightSummary ? paidFlightSummary
        : category === "hotels" && paidAccommodationSummary ? paidAccommodationSummary
        : category === "activiteiten" && paidActivitySummary ? paidActivitySummary
        : expenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amountEur, 0),
      iconName,
      sourceLines: categorySourceLines.get(category) || [],
    }));

  const categoryLabel = new Map(categoryBudgets.map((item) => [item.category, item.label]));
  const countryMatches = (budgetCountry: string, expenseCountry?: string) => {
    if (!expenseCountry) return false;
    const budget = compact(budgetCountry);
    const expense = compact(expenseCountry);
    if (budget === "usa") return expense === "verenigdestaten";
    if (budget.includes("thailandsindoha")) return ["thailand", "singapore", "qatar"].includes(expense);
    return budget === expense;
  };
  const countryGroups = countryDailyBudgets.map((countryBudget) => {
    const countryExpenses = expenses.filter((item) => countryMatches(countryBudget.country, item.country));
    const countryPlannedLines = Array.from(categorySourceLines.values())
      .flat()
      .filter((line) => countryMatches(countryBudget.country, line.country));
    const categories = Array.from(new Set<ExpenseItem["category"]>([
      "boodschappen",
      ...countryPlannedLines.map((line) => line.category || "overig"),
      ...countryExpenses.map((item) => item.category),
    ])).map((category) => {
      const plannedLines = (categorySourceLines.get(category) || []).filter((line) => countryMatches(countryBudget.country, line.country));
      const actualLines: BudgetDashboardLine[] = countryExpenses
        .filter((item) => item.category === category)
        .map((item) => ({ label: item.description || item.title || category, amountEur: item.amountEur, source: item.date || "Geïmporteerde uitgave", category, country: item.country, kind: "actual" }));
      return {
        category,
        label: categoryLabel.get(category) || category,
        plannedEur: plannedLines.reduce((sum, line) => sum + (line.amountEur || 0), 0),
        actualEur: actualLines.reduce((sum, line) => sum + (line.amountEur || 0), 0),
        sourceLines: [...plannedLines, ...actualLines],
      };
    });
    const plannedEur = categories.reduce((sum, category) => sum + category.plannedEur, 0);
    return {
      country: countryBudget.country,
      days: countryBudget.days,
      dailyBudgetEur: countryBudget.dailyBudgetEur,
      plannedEur,
      actualEur: countryExpenses.reduce((sum, item) => sum + item.amountEur, 0),
      categories,
    };
  });

  const globalCategoryGroups = categoryBudgets.map((item) => ({
    category: item.category,
    label: item.label,
    plannedEur: item.budgetEur,
    actualEur: item.spentEur,
    sourceLines: [
      ...(item.sourceLines || []),
      ...(item.spentEur > 0 ? [{ label: `${item.label} · totaal betaald`, amountEur: item.spentEur, source: "Budget!A9:B12", category: item.category, kind: "actual" as const }] : []),
    ],
  }));

  const budgetDashboard: BudgetDashboardData = {
    homeCostsEur: summaryHomeCostsEur || homeCostsEur,
    upfrontCostsEur: summaryUpfrontCostsEur || upfrontCostsEur,
    travelCostsEur,
    contingencyEur,
    totalNeededEur,
    alreadyPaidEur,
    fundingTotalEur,
    fundingDifferenceEur: fundingTotalEur - totalNeededEur,
    paidBreakdown: [
      { label: "Vluchten", amountEur: paidFlightSummary || expenses.filter((item) => item.category === "vluchten").reduce((sum, item) => sum + item.amountEur, 0) },
      { label: "Accommodaties", amountEur: paidAccommodationSummary || expenses.filter((item) => item.category === "hotels").reduce((sum, item) => sum + item.amountEur, 0) },
      { label: "Excursies", amountEur: paidActivitySummary || expenses.filter((item) => item.category === "activiteiten").reduce((sum, item) => sum + item.amountEur, 0) },
    ],
    fundingLines,
    monthlyIncomeEur,
    incomeLines,
    countryDailyBudgets,
    countryGroups,
    globalCategoryGroups,
    sourceSheet: sheetName || "Budget",
    totalBudget: totalNeededEur,
    totalNeeded: totalNeededEur,
    totalAvailable: fundingTotalEur,
    totalPaid: alreadyPaidEur,
    totalSpent: alreadyPaidEur,
    remaining: Math.max(0, totalNeededEur - alreadyPaidEur),
    homeCosts: summaryHomeCostsEur || homeCostsEur,
    preTripCosts: summaryUpfrontCostsEur || upfrontCostsEur,
    travelCosts: travelCostsEur,
    contingency: contingencyEur,
    funding: fundingTotalEur,
  };

  return { expenses, categoryBudgets, budgetDashboard };
}
function buildCountries(timeline: TimelineDay[]): CountryPlan[] {
  const order: string[] = [];
  timeline.forEach((day) => { if (!order.includes(day.land)) order.push(day.land); });
  return order.map((land, index) => {
    const days = timeline.filter((day) => day.land === land);
    const cities = Array.from(new Set(days.map((day) => day.plaats).filter(Boolean)));
    const coordDay = days.find((day) => day.gps.lat !== 0) || days[0];
    return { id: `excel-country-${index + 1}`, land, flag: FLAG[land] || "🌍", startDate: days[0]?.date || "", endDate: days.at(-1)?.date || "", routeDescription: cities.join(" → "), mapCoordinates: coordDay?.gps || { lat: 0, lng: 0, label: land }, highlightCities: cities };
  });
}

export function createExcelImportPreview(workbook: XLSX.WorkBook, fileName: string): ExcelImportPreview {
  const warnings: string[] = [];
  const { timeline, sourceRows } = parseGlobalPlanning(workbook, warnings);
  const detailSheets = mergeDetailPlanning(workbook, timeline, warnings);
  const accommodations = parseAccommodations(workbook, timeline, sourceRows);
  const { flights, carRentals, expenses: flightExpenses } = parseFlights(workbook, warnings);
  const checklists = parseChecklist(workbook);
  const documents = parseInsurance(workbook);
  const { activities, savedLocations, expenses: activityExpenses } = parseActivities(workbook, timeline);
  const parsedBudget = parseBudget(workbook, sourceRows, flightExpenses, activityExpenses);
  const packingItems = parsePackingList(workbook);
  const emergencies = parseEmergencies(workbook);
  const countries = buildCountries(timeline);
  if (!timeline.length) warnings.push("Geen geldige reisdagen gevonden in ‘Planning simpel’.");
  if (!detailSheets.length) warnings.push("Geen detailtabbladen gevonden met een naam als ‘Planning USA’ of ‘Dagplanning - …’.");
  if (!flights.length) warnings.push("Geen vluchten gevonden in ‘Vluchten en vervoer’ of de vluchttabel op ‘Budget’.");
  const missingGps = timeline.filter((day) => day.gps.lat === 0).length;
  if (missingGps) warnings.push(`${missingGps} reisdagen hebben nog geen herkende kaartcoördinaten.`);
  return { fileName, sheets: workbook.SheetNames, timeline, countries, accommodations, flights, activities, savedLocations, checklists, documents, budgetExpenses: parsedBudget.expenses, categoryBudgets: parsedBudget.categoryBudgets, packingItems, carRentals, emergencies, budgetDashboard: parsedBudget.budgetDashboard, warnings, detailSheets };
}

export function applyExcelImport(data: TripDataState, preview: ExcelImportPreview, replace: boolean): TripDataState {
  // Handmatig toegevoegde en aangepaste regels blijven ook bij een latere Excel-import behouden.
  const deletedIds = new Set<string>(data.deletedItemIds || []);
  const merge = <T extends { id?: string; source?: string; localModifiedAt?: string },>(current: T[], incoming: T[]) => {
    const allowedIncoming = incoming.filter((item) => !item.id || !deletedIds.has(item.id));
    const incomingById = new Map(allowedIncoming.filter((item) => item.id).map((item) => [item.id as string, item]));
    const preserved = current.filter((item) => item.source === "manual" || Boolean(item.localModifiedAt));
    if (replace) {
      const result = allowedIncoming.map((item) => {
        const local = item.id ? preserved.find((entry) => entry.id === item.id) : undefined;
        return local ? { ...item, ...local } : item;
      });
      preserved.forEach((item) => { if (!item.id || !incomingById.has(item.id)) result.push(item); });
      return result;
    }
    const result = [...current];
    allowedIncoming.forEach((item) => {
      const index = item.id ? result.findIndex((entry) => entry.id === item.id) : -1;
      if (index < 0) result.push(item);
      else if (!result[index].localModifiedAt) result[index] = { ...result[index], ...item };
    });
    return result;
  };
  const firstDay = preview.timeline[0];
  const lastDay = preview.timeline.at(-1);
  const totalKm = preview.timeline.reduce((sum, day) => {
    const match = day.activiteiten.join(" ").match(/([\d.]+)\s*km/i);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);
  return {
    ...data,
    timeline: merge(data.timeline, preview.timeline),
    countries: merge(data.countries, preview.countries),
    accommodations: merge(data.accommodations, preview.accommodations),
    flights: merge(data.flights, preview.flights),
    activities: merge(data.activities, preview.activities),
    savedLocations: merge(data.savedLocations, preview.savedLocations),
    checklists: merge(data.checklists, preview.checklists),
    documents: merge(data.documents, preview.documents),
    budgetExpenses: merge(data.budgetExpenses, preview.budgetExpenses),
    categoryBudgets: replace ? preview.categoryBudgets : [...data.categoryBudgets, ...preview.categoryBudgets],
    budgetDashboard: preview.budgetDashboard,
    packingItems: merge(data.packingItems, preview.packingItems),
    packingPeople: replace ? merge(data.packingPeople || [], [
      { id: "packing-bas", name: "Bas", kind: "person" },
      { id: "packing-maartje", name: "Maartje", kind: "person" },
      { id: "packing-liz", name: "Liz", kind: "person" },
      { id: "packing-isa", name: "Isa", kind: "person" },
      { id: "packing-general", name: "Algemeen", kind: "general" },
      { id: "packing-children", name: "Spullen kinderen", kind: "children" },
    ]) : data.packingPeople,
    familyMembers: replace ? merge(data.familyMembers, [
      { id: "family-bas", name: "Bas", naam: "Bas", healthEntries: [] },
      { id: "family-maartje", name: "Maartje", naam: "Maartje", healthEntries: [] },
      { id: "family-liz", name: "Liz", naam: "Liz", healthEntries: [] },
      { id: "family-isa", name: "Isa", naam: "Isa", healthEntries: [] },
    ]) : data.familyMembers,
    emergencies: merge(data.emergencies || [], preview.emergencies),
    notifications: replace ? [] : data.notifications,
    camper: data.camper.localModifiedAt ? data.camper : preview.carRentals.length ? {
      ...data.camper,
      activeOption: "auto",
      carOption: preview.carRentals[0],
      carRentals: replace ? preview.carRentals : [...(data.camper.carRentals || [data.camper.carOption]), ...preview.carRentals],
    } : (replace ? { ...data.camper, carOption: { modelName: "Nog invullen", category: "Huurauto", company: "Nog invullen", ophaallocatie: "", inleverlocatie: "", ophaaldatum: "", inleverdatum: "", dagprijsEur: 0, brandstofverbruikLPer100Km: 0, verzekeringInfo: "", hotelBudgetPerNachtEur: 0 }, carRentals: [] } : data.camper),
    overview: firstDay ? {
      ...data.overview,
      title: "Wereldreis 2026–2027",
      familyTitle: "Familie Keiman–Marree",
      startDate: firstDay.date,
      endDate: lastDay?.date || data.overview.endDate,
      totalDays: preview.timeline.length,
      currentDay: 1,
      currentCountry: firstDay.land,
      currentCity: firstDay.plaats,
      currentGps: firstDay.gps,
      visitedCountriesCount: preview.countries.length,
      totalKmTraveled: totalKm,
      nextFlight: preview.flights[0] ? { ...data.overview.nextFlight, flightNumber: preview.flights[0].flightNumber, airline: preview.flights[0].airline, fromCode: preview.flights[0].fromCode || preview.flights[0].fromCity, toCode: preview.flights[0].toCode || preview.flights[0].toCity, departureTime: preview.flights[0].departureTime, gate: preview.flights[0].gate, seat: preview.flights[0].seat } : { flightNumber: "", airline: "", fromCode: "", toCode: "", departureTime: "", gate: "", seat: "", countdownText: "" },
    } : data.overview,
  };
}
