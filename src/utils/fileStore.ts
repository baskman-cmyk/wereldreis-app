/**
 * Opslag van grote bestanden (PDF's, foto's) in IndexedDB.
 *
 * Tot v2.18.2 werden bestanden als Base64 dataURL rechtstreeks in de reisdata
 * (en dus in localStorage) opgeslagen. localStorage is beperkt tot een paar MB,
 * dus daar liep de app op vast: foto's van het vaccinatieboekje, PDF-bijlagen,
 * dagboekfoto's, etc. konden de opslag laten overlopen zonder duidelijke
 * foutmelding, en gingen na een herstart soms gewoon verloren.
 *
 * Vanaf deze versie worden bestanden als Blob in IndexedDB bewaard. In de
 * reisdata (die nog steeds in localStorage staat) wordt alleen een lichte
 * verwijzing bewaard: { fileId, name, size, type, uploadedAt }. IndexedDB kent
 * geen praktische MB-limiet (browsers reserveren doorgaans een percentage van
 * de vrije schijfruimte) en blijft, net als localStorage, gewoon offline
 * beschikbaar.
 */

const DB_NAME = "wereldreis-files";
const DB_VERSION = 1;
const STORE_NAME = "files";

export interface StoredFileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  blob: Blob;
}

export interface StoredFileMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is niet beschikbaar in deze browser."));
  }
  if (!dbPromise) {
    const openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB kon niet worden geopend."));
      request.onblocked = () => reject(new Error("IndexedDB is geblokkeerd door een andere tab."));
    });
    dbPromise = openPromise.catch((error: unknown) => {
      // Laat een mislukte open-poging niet voor de rest van de sessie vastzitten: als de oorzaak
      // tijdelijk was (bijv. een andere tab die de upgrade blokkeerde), mag de volgende aanroep
      // gewoon opnieuw proberen te openen in plaats van dezelfde afgewezen promise te hergebruiken.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

function generateFileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function runTransaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = work(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      const error = request.error;
      if (error?.name === "QuotaExceededError") {
        reject(new Error("De lokale opslag van dit apparaat zit vol. Maak eerst een bestanden-back-up en verwijder daarna enkele oude bijlagen om ruimte vrij te maken."));
      } else {
        reject(error || new Error("Bestandsopslag is mislukt."));
      }
    };
  });
}

/** Slaat een Blob op in IndexedDB en geeft het gegenereerde fileId terug. */
export async function putFile(input: { name: string; type: string; blob: Blob; uploadedAt?: string; id?: string }): Promise<StoredFileMeta> {
  const record: StoredFileRecord = {
    id: input.id || generateFileId(),
    name: input.name,
    type: input.type || "application/octet-stream",
    size: input.blob.size,
    uploadedAt: input.uploadedAt || new Date().toISOString(),
    blob: input.blob,
  };
  await runTransaction("readwrite", (store) => store.put(record));
  const { blob: _blob, ...meta } = record;
  return meta;
}

export async function getFileRecord(id: string): Promise<StoredFileRecord | undefined> {
  return runTransaction("readonly", (store) => store.get(id));
}

export async function deleteFile(id: string): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(id));
}

export async function clearAllFiles(): Promise<void> {
  await runTransaction("readwrite", (store) => store.clear());
}

export async function listFileMeta(): Promise<StoredFileMeta[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const results: StoredFileMeta[] = [];
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const record = cursor.value as StoredFileRecord;
        results.push({ id: record.id, name: record.name, type: record.type, size: record.size, uploadedAt: record.uploadedAt });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error || new Error("Bestandenlijst kon niet worden opgehaald."));
  });
}

// In-memory cache van aangemaakte object-URL's, zodat we ze niet telkens
// opnieuw hoeven te lezen uit IndexedDB en netjes kunnen opruimen.
const objectUrlCache = new Map<string, string>();

/** Geeft een (gecachete) blob: object-URL terug voor een fileId, of undefined als het bestand niet bestaat. */
export async function getObjectUrl(fileId: string): Promise<string | undefined> {
  const cached = objectUrlCache.get(fileId);
  if (cached) return cached;
  const record = await getFileRecord(fileId);
  if (!record) return undefined;
  const url = URL.createObjectURL(record.blob);
  objectUrlCache.set(fileId, url);
  return url;
}

export function revokeObjectUrl(fileId: string): void {
  const url = objectUrlCache.get(fileId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(fileId);
  }
}

/** Converteert een (legacy) dataURL string naar een Blob. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  if (!header || body === undefined) throw new Error("Het bestand is niet volledig opgeslagen.");
  const mime = header.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
  const isBase64 = header.includes(";base64");
  const binary = isBase64 ? atob(body) : decodeURIComponent(body);
  const array = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) array[index] = binary.charCodeAt(index);
  return new Blob([array], { type: mime });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Bestand kon niet worden gecodeerd."));
    reader.onerror = () => reject(new Error("Bestand kon niet worden gecodeerd."));
    reader.readAsDataURL(blob);
  });
}

/** Slaat een File rechtstreeks op (zonder Base64-omweg) en geeft de metadata terug. */
export async function storeRawFile(file: File): Promise<StoredFileMeta> {
  return putFile({ name: file.name, type: file.type || "application/octet-stream", blob: file });
}

/**
 * Verkleint een afbeelding (max 1800px langste zijde) en slaat die als Blob op,
 * zodat er geen Base64-omweg via canvas.toDataURL nodig is.
 */
export async function storeOptimizedImage(file: File): Promise<StoredFileMeta> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("De afbeelding kon niet worden verwerkt.")); };
    image.onload = () => {
      const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const keepPng = file.type === "image/png";
      canvas.toBlob(
        (result) => {
          URL.revokeObjectURL(objectUrl);
          if (result) resolve(result); else reject(new Error("De afbeelding kon niet worden verwerkt."));
        },
        keepPng ? "image/png" : "image/jpeg",
        keepPng ? undefined : 0.82,
      );
    };
    image.src = objectUrl;
  });
  return putFile({ name: file.name, type: blob.type, blob });
}

export interface StorageSummary { count: number; sizeBytes: number }

// Bestanden die korter dan dit geleden zijn geüpload, worden NOOIT als weesbestand opgeruimd —
// ook niet als er op dat moment nog niets in de reisdata naar verwijst. Dit beschermt bewust de
// "conceptfase" van een upload: bijv. het formulier "Nieuw document" (DocumentenView) en "Nieuwe
// dagboekfoto" (DagboekView) slaan het bestand meteen in IndexedDB op zodra je het kiest, maar
// koppelen het pas aan de reisdata zodra je op "Opslaan"/"Toevoegen" klikt. Zonder deze marge kon
// de achtergrond-opschoning zo'n net geüpload bestand alweer verwijderen terwijl je het formulier
// nog aan het invullen was — met "dit bestand kon niet worden gevonden" tot gevolg zodra je daarna
// opsloeg.
const ORPHAN_GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minuten

export async function getStoredFilesSummary(): Promise<StorageSummary> {
  try {
    const files = await listFileMeta();
    return { count: files.length, sizeBytes: files.reduce((sum, file) => sum + file.size, 0) };
  } catch {
    return { count: 0, sizeBytes: 0 };
  }
}

/** Vraagt de browser om persistente opslag (voorkomt dat IndexedDB automatisch wordt opgeschoond bij schijfdruk). */
export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined;
  try {
    const already = await navigator.storage.persisted?.();
    if (already) return true;
    return await navigator.storage.persist();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Backup / restore van alle bestanden (los van de reisdata-JSON)
// ---------------------------------------------------------------------------

export interface FilesBackupEntry {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  dataBase64: string;
}

export interface FilesBackup {
  version: 1;
  savedAt: string;
  files: FilesBackupEntry[];
}

/** Bouwt een backup-object met alle bestanden uit IndexedDB (voor download als apart bestand). */
export async function buildFilesBackup(): Promise<FilesBackup> {
  const metas = await listFileMeta();
  const files: FilesBackupEntry[] = [];
  for (const meta of metas) {
    const record = await getFileRecord(meta.id);
    if (!record) continue;
    const dataUrl = await blobToDataUrl(record.blob);
    files.push({ id: meta.id, name: meta.name, type: meta.type, size: meta.size, uploadedAt: meta.uploadedAt, dataBase64: dataUrl });
  }
  return { version: 1, savedAt: new Date().toISOString(), files };
}

/** Zet een eerder gedownloade bestanden-backup terug in IndexedDB. */
export async function restoreFilesBackup(backup: FilesBackup): Promise<number> {
  let restored = 0;
  for (const entry of backup.files) {
    const blob = dataUrlToBlob(entry.dataBase64);
    await putFile({ id: entry.id, name: entry.name, type: entry.type, blob, uploadedAt: entry.uploadedAt });
    restored += 1;
  }
  return restored;
}

// ---------------------------------------------------------------------------
// Eenmalige migratie van oude dataUrl-bestanden (v2.18.2 en eerder) naar IndexedDB
// ---------------------------------------------------------------------------

const isLegacyDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:") && value.includes(",") && value.length > 32;

/**
 * Doorzoekt de volledige reisdata recursief naar oude, inline opgeslagen
 * dataURL-bestanden (StoredPdf.dataUrl en PhotoItem.url/dataUrl) en verplaatst
 * ze naar IndexedDB. Dezelfde dataURL wordt maar één keer opgeslagen (dedupe).
 * Geeft de bijgewerkte data en het aantal gemigreerde bestanden terug.
 */
export async function migrateLegacyDataUrls<T>(data: T): Promise<{ data: T; migratedCount: number }> {
  const seen = new Map<string, string>();
  let migratedCount = 0;

  const migrateOne = async (dataUrl: string, name: string, type?: string): Promise<string> => {
    const cached = seen.get(dataUrl);
    if (cached) return cached;
    const blob = dataUrlToBlob(dataUrl);
    const meta = await putFile({ name: name || "bestand", type: type || blob.type, blob });
    seen.set(dataUrl, meta.id);
    migratedCount += 1;
    return meta.id;
  };

  const visit = async (value: unknown): Promise<unknown> => {
    if (Array.isArray(value)) {
      const result = [];
      for (const item of value) result.push(await visit(item));
      return result;
    }
    if (value && typeof value === "object") {
      const obj: Record<string, unknown> = { ...(value as Record<string, unknown>) };

      // StoredPdf-achtige objecten: { dataUrl, name, type }
      if (isLegacyDataUrl(obj.dataUrl) && !obj.fileId) {
        obj.fileId = await migrateOne(obj.dataUrl as string, (obj.name as string) || "bestand", obj.type as string | undefined);
        delete obj.dataUrl;
      }

      // PhotoItem-achtige objecten: lokale foto's stonden als dataURL in `url`
      if (isLegacyDataUrl(obj.url) && !obj.fileId) {
        obj.fileId = await migrateOne(obj.url as string, (obj.caption as string) || "foto", obj.type as string | undefined);
        obj.url = "";
        if (isLegacyDataUrl(obj.dataUrl)) delete obj.dataUrl;
      }

      for (const key of Object.keys(obj)) {
        if (key === "dataUrl" || key === "url" || key === "fileId") continue;
        obj[key] = await visit(obj[key]);
      }
      return obj;
    }
    return value;
  };

  const migratedData = (await visit(data)) as T;
  return { data: migratedData, migratedCount };
}

// ---------------------------------------------------------------------------
// Opschonen van "weesbestanden" (blobs in IndexedDB waar geen enkele fileId
// meer naar verwijst in de reisdata — bijv. na het verwijderen of vervangen
// van een bijlage, een dagboekfoto, een vaccinatieboekje-foto, of een hele
// reisdag/document). Zonder dit blijft elk verwijderd bestand voor altijd
// ruimte innemen in IndexedDB.
// ---------------------------------------------------------------------------

/** Verzamelt recursief alle `fileId`-waarden die nog ergens in de reisdata worden gebruikt. */
export function collectReferencedFileIds(data: unknown): Set<string> {
  const referenced = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const item = value as Record<string, unknown>;
    if (typeof item.fileId === "string" && item.fileId) referenced.add(item.fileId);
    Object.values(item).forEach(visit);
  };
  visit(data);
  return referenced;
}

/**
 * Verwijdert bestanden uit IndexedDB waar de reisdata niet meer naar verwijst.
 * `extraProtectedData` (bijv. het laatste herstelpunt) telt ook mee als "nog in gebruik",
 * zodat een herstelpunt terugzetten niet kan verwijzen naar een intussen opgeruimd bestand.
 * Geeft het aantal verwijderde bestanden en de vrijgemaakte ruimte (bytes) terug.
 */
export async function pruneOrphanedFiles(data: unknown, ...extraProtectedData: unknown[]): Promise<{ removedCount: number; freedBytes: number }> {
  const referenced = collectReferencedFileIds(data);
  for (const extra of extraProtectedData) {
    if (!extra) continue;
    for (const id of collectReferencedFileIds(extra)) referenced.add(id);
  }
  const cutoff = Date.now() - ORPHAN_GRACE_PERIOD_MS;
  const stored = await listFileMeta();
  let removedCount = 0;
  let freedBytes = 0;
  for (const file of stored) {
    if (referenced.has(file.id)) continue;
    const uploadedAtMs = Date.parse(file.uploadedAt);
    if (Number.isFinite(uploadedAtMs) && uploadedAtMs > cutoff) continue; // nog in de conceptfase, niet aankomen
    await deleteFile(file.id);
    revokeObjectUrl(file.id);
    removedCount += 1;
    freedBytes += file.size;
  }
  return { removedCount, freedBytes };
}
