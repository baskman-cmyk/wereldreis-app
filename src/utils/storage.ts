import { TripDataState } from "../types";
import { initialTripData } from "../data/initialTripData";
import {
  buildFilesBackup,
  clearAllFiles,
  getStoredFilesSummary,
  migrateLegacyDataUrls,
  pruneOrphanedFiles,
  requestPersistentStorage,
  restoreFilesBackup,
  type FilesBackup,
} from "./fileStore";

const STORAGE_KEY = "WORLD_TRIP_DASHBOARD_DATA_V2";
const LEGACY_STORAGE_KEY = "WORLD_TRIP_DASHBOARD_DATA_V1";
const BACKUP_KEY = "WORLD_TRIP_DASHBOARD_DATA_BACKUP_V1";
const LAST_EXPORT_KEY = "WORLD_TRIP_DASHBOARD_LAST_BACKUP_EXPORT";
const LAST_EXCEL_IMPORT_KEY = "WORLD_TRIP_DASHBOARD_LAST_EXCEL_IMPORT";
const STORAGE_VERSION = 2;

interface StorageEnvelope {
  version: number;
  savedAt: string;
  data: TripDataState;
}

export interface StorageStatus {
  savedAt?: string;
  sizeBytes: number;
  hasRecoveryPoint: boolean;
  lastBackupExport?: string;
  lastExcelImport?: { importedAt: string; fileName: string };
}

export interface AttachmentStorageSummary { count: number; sizeBytes: number; }
export interface OfflineReadinessStatus {
  serviceWorkerReady: boolean;
  appShellCached: boolean;
  cachedFiles: number;
  usageBytes?: number;
  quotaBytes?: number;
  persistentStorage?: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function mergeWithDefaults(parsed: Partial<TripDataState>): TripDataState {
  return {
    ...initialTripData,
    ...parsed,
    overview: {
      ...initialTripData.overview,
      ...(parsed.overview || {}),
    },
    budgetDashboard: parsed.budgetDashboard || initialTripData.budgetDashboard,
    camper: (() => {
      const migrateRental = (rental: any) => {
        const insuranceText = typeof rental?.verzekeringInfo === "string" ? rental.verzekeringInfo : "";
        const legacyBooking = insuranceText.match(/(?:Reserveringsnummer|Reservering)\s*:\s*([^·\n]+)/i)?.[1]?.trim();
        return {
          ...rental,
          id: rental?.id || undefined,
          pickupLocation: rental?.pickupLocation || rental?.ophaallocatie || undefined,
          ophaallocatie: rental?.ophaallocatie || rental?.pickupLocation || undefined,
          dropoffLocation: rental?.dropoffLocation || rental?.returnLocation || rental?.inleverlocatie || undefined,
          returnLocation: rental?.returnLocation || rental?.dropoffLocation || rental?.inleverlocatie || undefined,
          inleverlocatie: rental?.inleverlocatie || rental?.dropoffLocation || rental?.returnLocation || undefined,
          pickupDate: rental?.pickupDate || rental?.ophaaldatum || undefined,
          ophaaldatum: rental?.ophaaldatum || rental?.pickupDate || undefined,
          dropoffDate: rental?.dropoffDate || rental?.returnDate || rental?.inleverdatum || undefined,
          returnDate: rental?.returnDate || rental?.dropoffDate || rental?.inleverdatum || undefined,
          inleverdatum: rental?.inleverdatum || rental?.dropoffDate || rental?.returnDate || undefined,
          bookingReference: rental?.bookingReference || legacyBooking || undefined,
          totalPrice: rental?.totalPrice ?? (Number(rental?.dagprijsEur) || undefined),
          currency: rental?.currency || (Number(rental?.dagprijsEur) ? "EUR" : undefined),
          pickupTime: rental?.pickupTime || undefined,
          returnTime: rental?.returnTime || undefined,
          notes: rental?.notes || undefined,
        };
      };
      const parsedRentals = Array.isArray(parsed.camper?.carRentals)
        ? parsed.camper!.carRentals!.map(migrateRental)
        : [];
      const parsedPrimary = migrateRental(parsed.camper?.carOption || initialTripData.camper.carOption);
      const rentals = parsedRentals.length ? parsedRentals : (parsedPrimary ? [parsedPrimary] : []);
      return {
        ...initialTripData.camper,
        ...(parsed.camper || {}),
        carOption: rentals[0] || parsedPrimary,
        carRentals: rentals,
        tankLevels: {
          ...initialTripData.camper.tankLevels,
          ...(parsed.camper?.tankLevels || {}),
        },
      };
    })(),
    accommodations: Array.isArray(parsed.accommodations)
      ? parsed.accommodations.map((accommodation: any) => {
          const notes = typeof accommodation?.bijzonderheden === "string" ? accommodation.bijzonderheden : "";
          const yesFromNote = (label: string): boolean | undefined => {
            const match = notes.match(new RegExp(`${label}\\s*:\s*(ja|nee)`, "i"));
            if (!match) return undefined;
            return match[1].toLowerCase() === "ja";
          };
          const via = notes.match(/Via\s*:\s*([^·]+)/i)?.[1]?.trim();
          return {
            ...accommodation,
            address: accommodation?.address || accommodation?.adres || accommodation?.location || undefined,
            adres: accommodation?.adres || accommodation?.address || undefined,
            phone: accommodation?.phone || accommodation?.telefoon || undefined,
            telefoon: accommodation?.telefoon || accommodation?.phone || undefined,
            website: accommodation?.website || undefined,
            price: accommodation?.price ?? (Number(accommodation?.prijsEur) || undefined),
            currency: accommodation?.currency || (Number(accommodation?.prijsEur) ? "EUR" : undefined),
            features: accommodation?.features || {
              booked: yesFromNote("Geboekt"),
              cancellable: yesFromNote("Annuleerbaar"),
              paid: yesFromNote("Betaald"),
              bookedVia: via || undefined,
              breakfast: yesFromNote("Ontbijt"),
              kitchen: yesFromNote("Keuken"),
              pool: yesFromNote("Zwembad"),
            },
          };
        })
      : initialTripData.accommodations,
    packingPeople: Array.isArray(parsed.packingPeople) && parsed.packingPeople.length
      ? parsed.packingPeople
      : initialTripData.packingPeople,
    familyMembers: (() => {
      const members = Array.isArray(parsed.familyMembers) ? parsed.familyMembers : [];
      const containsOldDemo = members.some((member: any) => /Mark van den Berg|Laura van den Berg|Lucas van den Berg|Emma van den Berg/i.test(member?.naam || member?.name || ""));
      return members.length && !containsOldDemo ? members : initialTripData.familyMembers;
    })(),
    flights: Array.isArray(parsed.flights)
      ? parsed.flights.map((flight: any) => {
          const legacyQr = typeof flight?.qrCodeText === "string" ? flight.qrCodeText.trim() : "";
          const looksLikeBookingReference = Boolean(legacyQr)
            && legacyQr.length <= 30
            && !legacyQr.startsWith("BOARDING-")
            && !legacyQr.startsWith("http")
            && /^[#A-Z0-9-]+$/i.test(legacyQr);
          return {
            ...flight,
            bookingReference: flight?.bookingReference || (looksLikeBookingReference ? legacyQr : undefined),
            qrCodeText: looksLikeBookingReference ? "" : legacyQr,
          };
        })
      : initialTripData.flights,
    widgetsConfig:
      Array.isArray(parsed.widgetsConfig) && parsed.widgetsConfig.length > 0
        ? parsed.widgetsConfig.map((widget: any, index) => ({
            id: typeof widget?.id === "string" ? widget.id : `widget-${index + 1}`,
            title: typeof widget?.title === "string" ? widget.title : "Widget",
            enabled: widget?.enabled ?? true,
          }))
        : initialTripData.widgetsConfig,
  };
}

export function validateImportedTripData(value: unknown): TripDataState {
  const candidate = isObject(value) && isObject(value.data) ? value.data : value;
  if (!isObject(candidate)) {
    throw new Error("Het back-upbestand bevat geen geldige reisgegevens.");
  }

  if (!isObject(candidate.overview) || !Array.isArray(candidate.timeline)) {
    throw new Error("Verplichte onderdelen 'overview' en 'timeline' ontbreken.");
  }

  const overview = candidate.overview as Record<string, unknown>;
  if (typeof overview.title !== "string" || typeof overview.startDate !== "string") {
    throw new Error("De reisinformatie in dit bestand is onvolledig.");
  }

  return mergeWithDefaults(candidate as Partial<TripDataState>);
}

function parseStoredValue(raw: string): { data: TripDataState; savedAt?: string } {
  const parsed: unknown = JSON.parse(raw);
  if (isObject(parsed) && typeof parsed.version === "number" && "data" in parsed) {
    return {
      data: validateImportedTripData(parsed),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined,
    };
  }
  return { data: validateImportedTripData(parsed) };
}

export function loadTripData(): TripDataState {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return parseStoredValue(current).data;

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = parseStoredValue(legacy).data;
      saveTripData(migrated);
      return migrated;
    }
  } catch (error) {
    console.error("Reisgegevens konden niet worden geladen:", error);
  }
  return initialTripData;
}

export function createRecoveryPoint(data: TripDataState): void {
  try {
    const envelope: StorageEnvelope = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.error("Herstelpunt kon niet worden gemaakt:", error);
  }
}

export function restoreRecoveryPoint(currentData?: TripDataState): TripDataState | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const restored = parseStoredValue(raw).data;
    if (currentData) createRecoveryPoint(currentData);
    saveTripData(restored);
    return restored;
  } catch (error) {
    console.error("Herstelpunt kon niet worden teruggezet:", error);
    return null;
  }
}

export function saveTripData(data: TripDataState): void {
  const envelope: StorageEnvelope = {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    data,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.error("Reisgegevens konden niet lokaal worden opgeslagen:", error);
    window.dispatchEvent(new CustomEvent<string>("wereldreis-storage-error", {
      detail: error instanceof Error ? error.message : "Onbekende opslagfout",
    }));
  }
}

export function getStorageStatus(): StorageStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "";
    const parsed = raw ? parseStoredValue(raw) : undefined;
    return {
      savedAt: parsed?.savedAt,
      sizeBytes: new Blob([raw]).size,
      hasRecoveryPoint: Boolean(localStorage.getItem(BACKUP_KEY)),
      lastBackupExport: localStorage.getItem(LAST_EXPORT_KEY) || undefined,
      lastExcelImport: (() => {
        try {
          const value = localStorage.getItem(LAST_EXCEL_IMPORT_KEY);
          return value ? JSON.parse(value) : undefined;
        } catch { return undefined; }
      })(),
    };
  } catch {
    return { sizeBytes: 0, hasRecoveryPoint: Boolean(localStorage.getItem(BACKUP_KEY)), lastBackupExport: localStorage.getItem(LAST_EXPORT_KEY) || undefined };
  }
}

export function recordExcelImport(fileName: string): void {
  localStorage.setItem(LAST_EXCEL_IMPORT_KEY, JSON.stringify({ importedAt: new Date().toISOString(), fileName }));
}

/** Telt bestanden die nog als legacy inline dataURL in de reisdata staan (niet meer gemigreerd). */
function getLegacyAttachmentSummary(data: TripDataState): AttachmentStorageSummary {
  const seen = new Set<string>();
  let count = 0;
  let sizeBytes = 0;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const item = value as Record<string, unknown>;
    if (typeof item.dataUrl === "string" && item.dataUrl.startsWith("data:") && !seen.has(item.dataUrl)) {
      seen.add(item.dataUrl);
      count += 1;
      sizeBytes += typeof item.size === "number" ? item.size : Math.max(0, Math.floor(item.dataUrl.length * 0.75));
    }
    Object.values(item).forEach(visit);
  };
  visit(data);
  return { count, sizeBytes };
}

/**
 * Geeft het totaal van alle bijlagen terug: bestanden die al in IndexedDB staan
 * plus (indien aanwezig) nog niet-gemigreerde legacy dataURL-bestanden.
 */
export async function getAttachmentStorageSummary(data: TripDataState): Promise<AttachmentStorageSummary> {
  const [stored, legacy] = await Promise.all([
    getStoredFilesSummary(),
    Promise.resolve(getLegacyAttachmentSummary(data)),
  ]);
  return { count: stored.count + legacy.count, sizeBytes: stored.sizeBytes + legacy.sizeBytes };
}

export async function checkOfflineReadiness(): Promise<OfflineReadinessStatus> {
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  let cachedFiles = 0;
  let appShellCached = false;
  if ("caches" in window) {
    const keys = await caches.keys();
    const appKeys = keys.filter((key) => key.startsWith("wereldreis-app-"));
    for (const key of appKeys) cachedFiles += (await caches.open(key).then((cache) => cache.keys())).length;
    appShellCached = Boolean(await caches.match("/index.html")) || Boolean(await caches.match("/"));
  }
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
  // Vraag meteen persistente opslag aan zodat IndexedDB (waar de bijlagen nu staan)
  // niet automatisch wordt opgeruimd door de browser bij schijfdruk.
  const persistentStorage = await requestPersistentStorage();
  return {
    serviceWorkerReady: Boolean(registration?.active || navigator.serviceWorker?.controller),
    appShellCached,
    cachedFiles,
    usageBytes: estimate.usage,
    quotaBytes: estimate.quota,
    persistentStorage,
  };
}

// ---------------------------------------------------------------------------
// Migratie en losse bestanden-backup
// ---------------------------------------------------------------------------

/**
 * Eenmalige migratie: doorzoekt de reisdata op oude, inline opgeslagen
 * dataURL-bestanden en verplaatst ze naar IndexedDB. Slaat het resultaat
 * meteen op. Geeft de bijgewerkte data en het aantal gemigreerde bestanden terug.
 */
export async function migrateAndSaveLegacyAttachments(data: TripDataState): Promise<{ data: TripDataState; migratedCount: number }> {
  const { data: migrated, migratedCount } = await migrateLegacyDataUrls(data);
  if (migratedCount > 0) saveTripData(migrated);
  return { data: migrated, migratedCount };
}

/** Downloadt alle bestanden (PDF's, foto's) uit IndexedDB als apart back-upbestand, los van de reisdata. */
export async function exportFilesBackup(): Promise<number> {
  const backup = await buildFilesBackup();
  downloadBlob(
    new Blob([JSON.stringify(backup)], { type: "application/json" }),
    `Wereldreis_Bestanden_Back-up_${new Date().toISOString().slice(0, 10)}.json`,
  );
  return backup.files.length;
}

/** Zet een eerder gedownloade bestanden-backup terug in IndexedDB. */
export async function importFilesBackup(json: unknown): Promise<number> {
  if (!json || typeof json !== "object" || !Array.isArray((json as FilesBackup).files)) {
    throw new Error("Dit bestand is geen geldige bestanden-back-up van de Wereldreis-app.");
  }
  return restoreFilesBackup(json as FilesBackup);
}

// ---------------------------------------------------------------------------
// Eén complete back-up: reisdata + alle bestanden samen in één downloadbaar
// JSON-bestand. Dit is de aanbevolen manier om te back-uppen — de losse
// "reisdata"- en "bestanden"-back-ups hierboven blijven bestaan voor gevorderd
// gebruik (bijv. reisdata bewerken in een teksteditor), maar geven bij import
// een waarschuwing als de bijbehorende bestanden ontbreken.
// ---------------------------------------------------------------------------

interface FullBackup {
  formatVersion: 2;
  savedAt: string;
  trip: StorageEnvelope;
  files: FilesBackup;
}

const isFullBackup = (value: unknown): value is FullBackup =>
  isObject(value) && value.formatVersion === 2 && isObject(value.trip) && isObject(value.files) && Array.isArray((value.files as unknown as FilesBackup).files);

/** Downloadt reisdata én alle bestanden samen in één back-upbestand. */
export async function exportFullBackup(data: TripDataState): Promise<{ fileCount: number }> {
  const filesBackup = await buildFilesBackup();
  const backup: FullBackup = {
    formatVersion: 2,
    savedAt: new Date().toISOString(),
    trip: { version: STORAGE_VERSION, savedAt: new Date().toISOString(), data },
    files: filesBackup,
  };
  downloadBlob(
    new Blob([JSON.stringify(backup)], { type: "application/json" }),
    `Wereldreis_Volledige_Back-up_${new Date().toISOString().slice(0, 10)}.json`,
  );
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  return { fileCount: filesBackup.files.length };
}

/**
 * Zet een complete back-up (reisdata + bestanden) terug. Herkent ook de oudere,
 * losse "reisdata-alleen"-back-up en waarschuwt dan dat bijlagen mogelijk ontbreken.
 */
export async function importFullBackup(json: unknown): Promise<{ data: TripDataState; filesRestored: number; filesMissingWarning: boolean }> {
  if (isFullBackup(json)) {
    const filesRestored = await restoreFilesBackup(json.files);
    const { data: migrated } = await migrateLegacyDataUrls(validateImportedTripData(json.trip));
    return { data: migrated, filesRestored, filesMissingWarning: false };
  }
  // Fallback: een oudere, losse reisdata-back-up (zonder bestanden). De bijbehorende
  // bestanden-back-up moet er apart bij worden geïmporteerd, anders missen bijlagen.
  const { data: migrated } = await migrateLegacyDataUrls(validateImportedTripData(json));
  return { data: migrated, filesRestored: 0, filesMissingWarning: true };
}

/**
 * Verwijdert bestanden uit de lokale opslag waar de reisdata niet meer naar verwijst — bijv.
 * omdat een bijlage, dagboekfoto of vaccinatieboekje-foto is verwijderd of vervangen. Zonder
 * dit blijven verwijderde bestanden onnodig ruimte innemen.
 */
/**
 * Verwijdert bestanden uit de lokale opslag waar de reisdata niet meer naar verwijst — bijv.
 * omdat een bijlage, dagboekfoto of vaccinatieboekje-foto is verwijderd of vervangen. Het
 * laatste herstelpunt telt ook als "in gebruik" mee, zodat een herstelpunt terugzetten niet
 * kan verwijzen naar een bestand dat intussen als weesbestand is opgeruimd.
 */
export async function pruneOrphanedAttachments(data: TripDataState): Promise<{ removedCount: number; freedBytes: number }> {
  const recoveryRaw = (() => {
    try { return localStorage.getItem(BACKUP_KEY); } catch { return null; }
  })();
  let recoveryData: unknown;
  try { recoveryData = recoveryRaw ? JSON.parse(recoveryRaw) : undefined; } catch { recoveryData = undefined; }
  return pruneOrphanedFiles(data, recoveryData);
}

/** Reset alle reisdata naar de standaardwaarden én maakt de lokale bestandsopslag (IndexedDB) leeg. */
export async function resetTripData(): Promise<TripDataState> {
  try {
    const current = loadTripData();
    createRecoveryPoint(current);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.error(error);
  }
  try {
    // Het herstelpunt van vlak hiervoor bevat alleen de reisdata (met fileId-verwijzingen),
    // niet de bestanden zelf — "fabrieksinstellingen herstellen" is dus ook echt een volledige
    // leegmaak van de lokale bestandsopslag, en geen manier om bestanden "per ongeluk" te bewaren.
    await clearAllFiles();
  } catch (error) {
    console.error("Lokale bestandsopslag kon niet volledig worden leeggemaakt:", error);
  }
  return initialTripData;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const escapeXml = escapeHtml;

export function exportToJSON(data: TripDataState): void {
  const envelope: StorageEnvelope = {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    data,
  };
  downloadBlob(
    new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }),
    `Wereldreis_Back-up_${new Date().toISOString().slice(0, 10)}.json`,
  );
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
}

export function exportBudgetToCSV(expenses: TripDataState["budgetExpenses"]): void {
  const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const headers = ["ID", "Datum", "Categorie", "Omschrijving", "BedragOrigineel", "Valuta", "BedragEUR", "Land", "BetaaldDoor"];
  const rows = expenses.map((expense) => [
    expense.id,
    expense.date,
    expense.category,
    expense.description,
    expense.amountOriginal,
    expense.currency,
    expense.amountEur.toFixed(2).replace(".", ","),
    expense.country,
    expense.paidBy,
  ]);
  const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `Wereldreis_Uitgaven_${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export function exportHikeToGPX(hike: TripDataState["hikes"][0]): void {
  const trackPoints = hike.gpsPoints
    .map((point) => `      <trkpt lat="${point.lat}" lon="${point.lng}">\n        <name>${escapeXml(point.label || hike.name)}</name>\n      </trkpt>`)
    .join("\n");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Wereldreis Dashboard">\n  <trk>\n    <name>${escapeXml(hike.name)} (${escapeXml(hike.land)})</name>\n    <desc>${escapeXml(hike.description)}</desc>\n    <trkseg>\n${trackPoints}\n    </trkseg>\n  </trk>\n</gpx>`;
  downloadBlob(new Blob([gpx], { type: "application/gpx+xml" }), `${hike.name.replace(/[^a-z0-9]+/gi, "_")}.gpx`);
}

export function exportTravelBookHTML(data: TripDataState): void {
  const title = escapeHtml(data.overview?.title || "Wereldreis");
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} - Reisboek</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px; color: #174A7E; background: #FFF; line-height: 1.6; }
    h1 { border-bottom: 3px solid #39B8C8; padding-bottom: 10px; }
    h2 { color: #267f8d; margin-top: 30px; }
    .meta { background: #F3E7C8; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .day-card { border: 1px solid #E2E8F0; padding: 15px; margin-bottom: 15px; border-radius: 8px; page-break-inside: avoid; }
    .highlight { font-weight: bold; }
    @media print { body { margin: 18mm; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <p><strong>Gezin:</strong> ${escapeHtml(data.overview.familyTitle)}</p>
    <p><strong>Reisperiode:</strong> ${escapeHtml(data.overview.startDate)} t/m ${escapeHtml(data.overview.endDate)} (${data.overview.totalDays} dagen)</p>
    <p><strong>Landen bezocht:</strong> ${data.overview.visitedCountriesCount} | <strong>Kilometers:</strong> ${data.overview.totalKmTraveled} km</p>
  </div>
  <h2>Dagboek &amp; hoogtepunten</h2>
  ${data.journals.map((journal) => `<article class="day-card"><h3>${escapeHtml(journal.datum)} - ${escapeHtml(journal.plaats)}, ${escapeHtml(journal.land)}</h3><p><strong>Hoogtepunt:</strong> ${escapeHtml(journal.hoogtepunt)}</p><p>${escapeHtml(journal.tekst).replace(/\n/g, "<br>")}</p><p class="highlight">Favoriete herinnering: ${escapeHtml(journal.favorieteHerinnering)}</p></article>`).join("")}
  <h2>Vluchten</h2>
  <ul>${data.flights.map((flight) => `<li>${escapeHtml(flight.departureDate)}: ${escapeHtml(flight.airline)} ${escapeHtml(flight.flightNumber)} (${escapeHtml(flight.fromCode)} &rarr; ${escapeHtml(flight.toCode)})</li>`).join("")}</ul>
  <h2>Camper &amp; route</h2>
  <p><strong>Campermodel:</strong> ${escapeHtml(data.camper.modelName)}</p>
  <p><strong>Verzekering:</strong> ${escapeHtml(data.camper.verzekeringInfo)}</p>
</body>
</html>`;
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `Reisboek_Wereldreis_${new Date().toISOString().slice(0, 10)}.html`);
}
