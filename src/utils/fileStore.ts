/**
 * Centrale bestandsopslag voor de Wereldreis-app.
 *
 * BESTANDEN WORDEN NIET IN LOCALSTORAGE OPGESLAGEN.
 *
 * Grote bestanden zoals:
 * - PDF's
 * - PNG/JPG-foto's
 * - dagboekfoto's
 * - vaccinatieboekjes
 * - documentbijlagen
 *
 * worden als Blob opgeslagen in IndexedDB.
 *
 * In de reisdata wordt alleen lichte metadata opgeslagen:
 *
 * {
 *   fileId,
 *   name,
 *   type,
 *   size,
 *   uploadedAt
 * }
 *
 * BELANGRIJK:
 * We gebruiken in de publieke API overal `fileId`.
 *
 * De IndexedDB-record gebruikt óók `fileId` als keyPath.
 *
 * Hierdoor bestaat er geen verwarring meer tussen:
 *
 *     id
 *     fileId
 *
 * Dit voorkomt de fout waarbij een bestand wel in IndexedDB staat,
 * maar later niet kan worden teruggevonden.
 */

/* -------------------------------------------------------------------------- */
/* CONFIGURATIE                                                               */
/* -------------------------------------------------------------------------- */

const DB_NAME = "wereldreis-files";
const DB_VERSION = 2;
const STORE_NAME = "files";

/*
 * Bestanden die minder lang geleden zijn geüpload dan deze periode
 * worden nooit automatisch als weesbestand verwijderd.
 *
 * Dit is belangrijk voor formulieren waarin een bestand eerst wordt
 * geüpload en pas later aan de reisdata wordt gekoppeld.
 */
const ORPHAN_GRACE_PERIOD_MS = 30 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * De daadwerkelijke IndexedDB-record.
 *
 * De Blob staat uitsluitend hier.
 */
export interface StoredFileRecord {
  fileId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  blob: Blob;
}

/**
 * Lichtgewicht metadata die in de reisdata kan worden opgeslagen.
 *
 * GEEN Blob.
 */
export interface StoredFileMeta {
  fileId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

/**
 * Samenvatting van de lokale bestandsopslag.
 */
export interface StorageSummary {
  count: number;
  sizeBytes: number;
}

/* -------------------------------------------------------------------------- */
/* INDEXEDDB                                                                  */
/* -------------------------------------------------------------------------- */

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Controleert of IndexedDB beschikbaar is.
 */
function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Opent de IndexedDB-database.
 *
 * Versie 2 gebruikt `fileId` als keyPath.
 *
 * De upgrade probeert bestaande records uit versie 1 te migreren:
 *
 *     id -> fileId
 *
 * zodat bestaande bestanden niet zomaar verdwijnen.
 */
function openDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(
      new Error(
        "IndexedDB is niet beschikbaar in deze browser. Bestanden kunnen niet lokaal worden opgeslagen."
      )
    );
  }

  if (dbPromise) {
    return dbPromise;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;

      /*
       * Eerste installatie.
       */
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "fileId",
        });

        return;
      }

      /*
       * Bestaande versie 1.
       *
       * De oude store gebruikte:
       *
       *     keyPath: "id"
       *
       * We kunnen een IndexedDB object store niet simpelweg zijn keyPath
       * laten veranderen. Daarom maken we bij de upgrade een tijdelijke
       * store en kopiëren we de records.
       */
      const oldStore = transaction?.objectStore(STORE_NAME);

      if (!oldStore) {
        return;
      }

      /*
       * Alleen uitvoeren wanneer de oude store nog `id` gebruikt.
       */
      if (oldStore.keyPath === "id") {
        const recordsRequest = oldStore.getAll();

        recordsRequest.onsuccess = () => {
          const records = recordsRequest.result as Array<
            StoredFileRecord & { id?: string }
          >;

          /*
           * Oude store verwijderen.
           *
           * Omdat dit binnen onupgradeneeded gebeurt, wordt de wijziging
           * onderdeel van dezelfde schema-upgrade.
           */
          db.deleteObjectStore(STORE_NAME);

          const newStore = db.createObjectStore(STORE_NAME, {
            keyPath: "fileId",
          });

          for (const oldRecord of records) {
            const fileId =
              oldRecord.fileId ||
              oldRecord.id;

            if (!fileId) {
              continue;
            }

            newStore.put({
              fileId,
              name: oldRecord.name || "bestand",
              type:
                oldRecord.type ||
                "application/octet-stream",
              size:
                typeof oldRecord.size === "number"
                  ? oldRecord.size
                  : oldRecord.blob?.size || 0,
              uploadedAt:
                oldRecord.uploadedAt ||
                new Date().toISOString(),
              blob: oldRecord.blob,
            });
          }
        };
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      /*
       * Als een andere tab de database verwijdert of wijzigt,
       * mag de volgende actie opnieuw een verbinding openen.
       */
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error(
            "IndexedDB kon niet worden geopend."
          )
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          "IndexedDB wordt geblokkeerd door een andere tab. Sluit de andere versie van de app en probeer opnieuw."
        )
      );
    };
  });

  dbPromise = promise.catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

/* -------------------------------------------------------------------------- */
/* HULPFUNCTIES                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Genereert een unieke fileId.
 */
function generateFileId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `file-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

/**
 * Zet een IndexedDB-fout om naar een duidelijke gebruikersfout.
 */
function normalizeStorageError(error: unknown): Error {
  if (
    error instanceof DOMException &&
    error.name === "QuotaExceededError"
  ) {
    return new Error(
      "De lokale opslag van dit apparaat zit vol. Maak eerst een bestanden-back-up en verwijder daarna enkele oude bijlagen."
    );
  }

  if (
    error instanceof Error &&
    error.name === "QuotaExceededError"
  ) {
    return new Error(
      "De lokale opslag van dit apparaat zit vol. Maak eerst een bestanden-back-up en verwijder daarna enkele oude bijlagen."
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Bestandsopslag is mislukt.");
}

/**
 * Voert één IndexedDB request uit binnen een transactie.
 *
 * De transactie wordt pas als succesvol beschouwd nadat zowel het request
 * als de transactie succesvol zijn afgerond.
 */
async function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (
    store: IDBObjectStore
  ) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    let transaction: IDBTransaction;

    try {
      transaction = db.transaction(
        STORE_NAME,
        mode
      );
    } catch (error) {
      reject(normalizeStorageError(error));
      return;
    }

    const store =
      transaction.objectStore(STORE_NAME);

    let request: IDBRequest<T>;

    try {
      request = work(store);
    } catch (error) {
      reject(normalizeStorageError(error));
      return;
    }

    let requestResult: T;

    request.onsuccess = () => {
      requestResult = request.result;
    };

    request.onerror = () => {
      if (settled) return;

      settled = true;
      reject(
        normalizeStorageError(request.error)
      );
    };

    transaction.oncomplete = () => {
      if (settled) return;

      settled = true;
      resolve(requestResult);
    };

    transaction.onerror = () => {
      if (settled) return;

      settled = true;
      reject(
        normalizeStorageError(
          transaction.error
        )
      );
    };

    transaction.onabort = () => {
      if (settled) return;

      settled = true;
      reject(
        normalizeStorageError(
          transaction.error ||
            new Error(
              "De bestandsopslag is afgebroken."
            )
        )
      );
    };
  });
}

/* -------------------------------------------------------------------------- */
/* BESTAND OPSLAAN                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Slaat een Blob op in IndexedDB.
 *
 * De belangrijkste afspraak:
 *
 *     fileId
 *
 * is zowel:
 *
 * - de ID in de reisdata
 * - de key in IndexedDB
 *
 * Hierdoor kan een attachment altijd rechtstreeks worden teruggevonden.
 */
export async function putFile(input: {
  name: string;
  type: string;
  blob: Blob;
  uploadedAt?: string;
  fileId?: string;
}): Promise<StoredFileMeta> {
  if (!input.blob) {
    throw new Error(
      "Er is geen bestand ontvangen."
    );
  }

  const fileId =
    input.fileId || generateFileId();

  const record: StoredFileRecord = {
    fileId,
    name: input.name || "bestand",
    type:
      input.type ||
      input.blob.type ||
      "application/octet-stream",
    size: input.blob.size,
    uploadedAt:
      input.uploadedAt ||
      new Date().toISOString(),
    blob: input.blob,
  };

  try {
    await runTransaction(
      "readwrite",
      (store) => store.put(record)
    );
  } catch (error) {
    throw normalizeStorageError(error);
  }

  return {
    fileId: record.fileId,
    name: record.name,
    type: record.type,
    size: record.size,
    uploadedAt: record.uploadedAt,
  };
}

/**
 * Slaat een File rechtstreeks op.
 */
export async function storeRawFile(
  file: File
): Promise<StoredFileMeta> {
  return putFile({
    name: file.name,
    type:
      file.type ||
      "application/octet-stream",
    blob: file,
  });
}

/**
 * Verkleint een afbeelding tot maximaal 1800px
 * aan de langste zijde en slaat hem als Blob op.
 */
export async function storeOptimizedImage(
  file: File
): Promise<StoredFileMeta> {
  const blob = await new Promise<Blob>(
    (resolve, reject) => {
      const objectUrl =
        URL.createObjectURL(file);

      const image = new Image();

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);

        reject(
          new Error(
            "De afbeelding kon niet worden verwerkt."
          )
        );
      };

      image.onload = () => {
        try {
          const longestSide = Math.max(
            image.width,
            image.height
          );

          const scale = Math.min(
            1,
            1800 / longestSide
          );

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = Math.max(
            1,
            Math.round(
              image.width * scale
            )
          );

          canvas.height = Math.max(
            1,
            Math.round(
              image.height * scale
            )
          );

          const context =
            canvas.getContext("2d");

          if (!context) {
            URL.revokeObjectURL(
              objectUrl
            );

            reject(
              new Error(
                "De afbeelding kon niet worden verwerkt."
              )
            );

            return;
          }

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const keepPng =
            file.type === "image/png";

          canvas.toBlob(
            (result) => {
              URL.revokeObjectURL(
                objectUrl
              );

              if (!result) {
                reject(
                  new Error(
                    "De afbeelding kon niet worden verwerkt."
                  )
                );

                return;
              }

              resolve(result);
            },
            keepPng
              ? "image/png"
              : "image/jpeg",
            keepPng
              ? undefined
              : 0.82
          );
        } catch (error) {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(
            new Error(
              "De afbeelding kon niet worden verwerkt."
            )
          );
        }
      };

      image.src = objectUrl;
    }
  );

  return putFile({
    name: file.name,
    type:
      blob.type ||
      file.type ||
      "image/jpeg",
    blob,
  });
}

/* -------------------------------------------------------------------------- */
/* BESTAND OPHALEN                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Haalt een bestand op met zijn fileId.
 */
export async function getFileRecord(
  fileId: string
): Promise<
  StoredFileRecord | undefined
> {
  if (!fileId) {
    return undefined;
  }

  return runTransaction(
    "readonly",
    (store) =>
      store.get(fileId)
  );
}

/**
 * Controleert of een bestand bestaat.
 */
export async function hasFile(
  fileId: string
): Promise<boolean> {
  if (!fileId) {
    return false;
  }

  const record =
    await getFileRecord(fileId);

  return !!record;
}

/**
 * Haalt een bestand op en geeft alleen de Blob terug.
 */
export async function getFileBlob(
  fileId: string
): Promise<Blob | undefined> {
  const record =
    await getFileRecord(fileId);

  return record?.blob;
}

/* -------------------------------------------------------------------------- */
/* BESTAND VERWIJDEREN                                                        */
/* -------------------------------------------------------------------------- */

export async function deleteFile(
  fileId: string
): Promise<void> {
  if (!fileId) {
    return;
  }

  await runTransaction(
    "readwrite",
    (store) =>
      store.delete(fileId)
  );

  revokeObjectUrl(fileId);
}

/**
 * Verwijdert alle bestanden uit IndexedDB.
 */
export async function clearAllFiles(): Promise<void> {
  await runTransaction(
    "readwrite",
    (store) =>
      store.clear()
  );

  for (const fileId of objectUrlCache.keys()) {
    revokeObjectUrl(fileId);
  }
}

/* -------------------------------------------------------------------------- */
/* BESTANDENLIJST                                                             */
/* -------------------------------------------------------------------------- */

export async function listFileMeta(): Promise<
  StoredFileMeta[]
> {
  const db = await openDb();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            STORE_NAME,
            "readonly"
          );
      } catch (error) {
        reject(
          normalizeStorageError(error)
        );
        return;
      }

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const results: StoredFileMeta[] =
        [];

      const request =
        store.openCursor();

      request.onsuccess = () => {
        const cursor =
          request.result;

        if (!cursor) {
          return;
        }

        const record =
          cursor.value as StoredFileRecord;

        results.push({
          fileId: record.fileId,
          name: record.name,
          type: record.type,
          size: record.size,
          uploadedAt:
            record.uploadedAt,
        });

        cursor.continue();
      };

      request.onerror = () => {
        reject(
          normalizeStorageError(
            request.error
          )
        );
      };

      transaction.oncomplete = () => {
        resolve(results);
      };

      transaction.onerror = () => {
        reject(
          normalizeStorageError(
            transaction.error
          )
        );
      };

      transaction.onabort = () => {
        reject(
          normalizeStorageError(
            transaction.error ||
              new Error(
                "Bestandenlijst kon niet worden opgehaald."
              )
          )
        );
      };
    }
  );
}

/* -------------------------------------------------------------------------- */
/* OBJECT URL CACHE                                                           */
/* -------------------------------------------------------------------------- */

const objectUrlCache =
  new Map<string, string>();

/**
 * Geeft een gecachete Object URL terug.
 */
export async function getObjectUrl(
  fileId: string
): Promise<string | undefined> {
  if (!fileId) {
    return undefined;
  }

  const cached =
    objectUrlCache.get(fileId);

  if (cached) {
    return cached;
  }

  const record =
    await getFileRecord(fileId);

  if (!record) {
    return undefined;
  }

  const url =
    URL.createObjectURL(
      record.blob
    );

  objectUrlCache.set(
    fileId,
    url
  );

  return url;
}

/**
 * Ruimt een Object URL op.
 */
export function revokeObjectUrl(
  fileId: string
): void {
  if (!fileId) {
    return;
  }

  const url =
    objectUrlCache.get(fileId);

  if (!url) {
    return;
  }

  URL.revokeObjectURL(url);

  objectUrlCache.delete(fileId);
}

/**
 * Ruimt alle Object URL's op.
 */
export function revokeAllObjectUrls(): void {
  for (const fileId of objectUrlCache.keys()) {
    revokeObjectUrl(fileId);
  }
}

/* -------------------------------------------------------------------------- */
/* DATAURL                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Converteert een legacy dataURL naar een Blob.
 */
export function dataUrlToBlob(
  dataUrl: string
): Blob {
  if (
    typeof dataUrl !== "string" ||
    !dataUrl.startsWith("data:")
  ) {
    throw new Error(
      "Het bestand heeft geen geldige dataURL."
    );
  }

  const commaIndex =
    dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error(
      "Het bestand is niet volledig opgeslagen."
    );
  }

  const header =
    dataUrl.slice(0, commaIndex);

  const body =
    dataUrl.slice(
      commaIndex + 1
    );

  const mime =
    header.match(
      /^data:([^;,]+)/
    )?.[1] ||
    "application/octet-stream";

  const isBase64 =
    header.includes(";base64");

  try {
    if (isBase64) {
      const binary =
        atob(body);

      const array =
        new Uint8Array(
          binary.length
        );

      for (
        let index = 0;
        index < binary.length;
        index += 1
      ) {
        array[index] =
          binary.charCodeAt(index);
      }

      return new Blob(
        [array],
        { type: mime }
      );
    }

    return new Blob(
      [decodeURIComponent(body)],
      { type: mime }
    );
  } catch {
    throw new Error(
      "Het bestand kon niet worden gelezen."
    );
  }
}

async function blobToDataUrl(
  blob: Blob
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result ===
          "string"
        ) {
          resolve(
            reader.result
          );
        } else {
          reject(
            new Error(
              "Bestand kon niet worden gecodeerd."
            )
          );
        }
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Bestand kon niet worden gecodeerd."
          )
        );
      };

      reader.readAsDataURL(blob);
    }
  );
}

/* -------------------------------------------------------------------------- */
/* OPSLAGRUIMTE                                                               */
/* -------------------------------------------------------------------------- */

export async function getStoredFilesSummary(): Promise<StorageSummary> {
  try {
    const files =
      await listFileMeta();

    return {
      count: files.length,
      sizeBytes:
        files.reduce(
          (sum, file) =>
            sum + file.size,
          0
        ),
    };
  } catch {
    return {
      count: 0,
      sizeBytes: 0,
    };
  }
}

/**
 * Vraagt de browser om persistente opslag.
 */
export async function requestPersistentStorage(): Promise<
  boolean | undefined
> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage?.persist
  ) {
    return undefined;
  }

  try {
    const alreadyPersisted =
      await navigator.storage.persisted?.();

    if (alreadyPersisted) {
      return true;
    }

    return await navigator.storage.persist();
  } catch {
    return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* BACKUP                                                                      */
/* -------------------------------------------------------------------------- */

export interface FilesBackupEntry {
  fileId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  dataBase64: string;
}

export interface FilesBackup {
  version: 2;
  savedAt: string;
  files: FilesBackupEntry[];
}

/**
 * Bouwt een volledige backup van alle IndexedDB-bestanden.
 *
 * De Blob wordt tijdelijk naar Base64 omgezet uitsluitend voor het
 * backupbestand. De normale opslag blijft Blob + IndexedDB.
 */
export async function buildFilesBackup(): Promise<FilesBackup> {
  const metas =
    await listFileMeta();

  const files: FilesBackupEntry[] =
    [];

  for (const meta of metas) {
    const record =
      await getFileRecord(
        meta.fileId
      );

    if (!record) {
      continue;
    }

    const dataBase64 =
      await blobToDataUrl(
        record.blob
      );

    files.push({
      fileId: meta.fileId,
      name: meta.name,
      type: meta.type,
      size: meta.size,
      uploadedAt:
        meta.uploadedAt,
      dataBase64,
    });
  }

  return {
    version: 2,
    savedAt:
      new Date().toISOString(),
    files,
  };
}

/**
 * Zet een bestandenbackup terug.
 *
 * De oorspronkelijke fileId wordt behouden.
 * Daardoor blijven bestaande verwijzingen in de reisdata geldig.
 */
export async function restoreFilesBackup(
  backup: FilesBackup
): Promise<number> {
  if (
    !backup ||
    !Array.isArray(backup.files)
  ) {
    throw new Error(
      "De bestandenbackup is ongeldig."
    );
  }

  let restored = 0;

  for (const entry of backup.files) {
    if (!entry.dataBase64) {
      continue;
    }

    const blob =
      dataUrlToBlob(
        entry.dataBase64
      );

    const fileId =
      entry.fileId;

    if (!fileId) {
      continue;
    }

    await putFile({
      fileId,
      name:
        entry.name ||
        "bestand",
      type:
        entry.type ||
        blob.type ||
        "application/octet-stream",
      blob,
      uploadedAt:
        entry.uploadedAt ||
        new Date().toISOString(),
    });

    restored += 1;
  }

  return restored;
}

/* -------------------------------------------------------------------------- */
/* LEGACY DATAURL-MIGRATIE                                                    */
/* -------------------------------------------------------------------------- */

const isLegacyDataUrl = (
  value: unknown
): value is string =>
  typeof value === "string" &&
  value.startsWith("data:") &&
  value.includes(",") &&
  value.length > 32;

/**
 * Migreert oude dataURL-bestanden naar IndexedDB.
 *
 * Ondersteunt onder andere:
 *
 *     { dataUrl, name, type }
 *
 * en:
 *
 *     { url: "data:...", caption: "..." }
 *
 * De dataURL wordt na succesvolle opslag verwijderd.
 */
export async function migrateLegacyDataUrls<T>(
  data: T
): Promise<{
  data: T;
  migratedCount: number;
}> {
  const seen =
    new Map<string, string>();

  let migratedCount = 0;

  const migrateOne = async (
    dataUrl: string,
    name: string,
    type?: string
  ): Promise<string> => {
    const existing =
      seen.get(dataUrl);

    if (existing) {
      return existing;
    }

    const blob =
      dataUrlToBlob(dataUrl);

    const meta =
      await putFile({
        name:
          name || "bestand",
        type:
          type ||
          blob.type ||
          "application/octet-stream",
        blob,
      });

    seen.set(
      dataUrl,
      meta.fileId
    );

    migratedCount += 1;

    return meta.fileId;
  };

  const visit = async (
    value: unknown
  ): Promise<unknown> => {
    if (Array.isArray(value)) {
      const result: unknown[] =
        [];

      for (const item of value) {
        result.push(
          await visit(item)
        );
      }

      return result;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      const obj: Record<
        string,
        unknown
      > = {
        ...(value as Record<
          string,
          unknown
        >),
      };

      /*
       * Oude StoredPdf:
       *
       * {
       *   dataUrl,
       *   name,
       *   type
       * }
       */
      if (
        isLegacyDataUrl(
          obj.dataUrl
        ) &&
        !obj.fileId
      ) {
        obj.fileId =
          await migrateOne(
            obj.dataUrl,
            typeof obj.name ===
              "string"
              ? obj.name
              : "bestand",
            typeof obj.type ===
              "string"
              ? obj.type
              : undefined
          );

        delete obj.dataUrl;
      }

      /*
       * Oude PhotoItem:
       *
       * {
       *   url: "data:..."
       * }
       */
      if (
        isLegacyDataUrl(
          obj.url
        ) &&
        !obj.fileId
      ) {
        obj.fileId =
          await migrateOne(
            obj.url,
            typeof obj.caption ===
              "string"
              ? obj.caption
              : "foto",
            typeof obj.type ===
              "string"
              ? obj.type
              : undefined
          );

        obj.url = "";

        if (
          isLegacyDataUrl(
            obj.dataUrl
          )
        ) {
          delete obj.dataUrl;
        }
      }

      /*
       * Recursief alle andere velden doorlopen.
       */
      for (const key of Object.keys(
        obj
      )) {
        if (
          key === "dataUrl" ||
          key === "url" ||
          key === "fileId"
        ) {
          continue;
        }

        obj[key] =
          await visit(obj[key]);
      }

      return obj;
    }

    return value;
  };

  const migratedData =
    (await visit(data)) as T;

  return {
    data: migratedData,
    migratedCount,
  };
}

/* -------------------------------------------------------------------------- */
/* REFERENTIES VERZAMELEN                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Verzamelt alle fileId's die ergens in de reisdata voorkomen.
 */
export function collectReferencedFileIds(
  data: unknown
): Set<string> {
  const referenced =
    new Set<string>();

  const visit = (
    value: unknown
  ): void => {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const item =
      value as Record<
        string,
        unknown
      >;

    if (
      typeof item.fileId ===
        "string" &&
      item.fileId
    ) {
      referenced.add(
        item.fileId
      );
    }

    Object.values(item).forEach(
      visit
    );
  };

  visit(data);

  return referenced;
}

/* -------------------------------------------------------------------------- */
/* WEESBESTANDEN OPSCHONEN                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Verwijdert IndexedDB-bestanden waar geen enkele fileId meer naar verwijst.
 *
 * Recente uploads worden beschermd door de grace period.
 */
export async function pruneOrphanedFiles(
  data: unknown,
  ...extraProtectedData: unknown[]
): Promise<{
  removedCount: number;
  freedBytes: number;
}> {
  const referenced =
    collectReferencedFileIds(
      data
    );

  for (const extra of extraProtectedData) {
    if (!extra) {
      continue;
    }

    for (const fileId of collectReferencedFileIds(
      extra
    )) {
      referenced.add(fileId);
    }
  }

  const cutoff =
    Date.now() -
    ORPHAN_GRACE_PERIOD_MS;

  const stored =
    await listFileMeta();

  let removedCount = 0;
  let freedBytes = 0;

  for (const file of stored) {
    /*
     * Nog in gebruik.
     */
    if (
      referenced.has(
        file.fileId
      )
    ) {
      continue;
    }

    /*
     * Recent bestand:
     * nog niet opruimen.
     */
    const uploadedAtMs =
      Date.parse(
        file.uploadedAt
      );

    if (
      Number.isFinite(
        uploadedAtMs
      ) &&
      uploadedAtMs > cutoff
    ) {
      continue;
    }

    await deleteFile(
      file.fileId
    );

    removedCount += 1;
    freedBytes += file.size;
  }

  return {
    removedCount,
    freedBytes,
  };
}
