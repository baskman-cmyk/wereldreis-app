import React, { useRef, useState } from "react";
import {
  Download,
  Eye,
  FileImage,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";

import { StoredPdf } from "../types";
import {
  dataUrlToBlob,
  deleteFile,
  getFileRecord,
  storeOptimizedImage,
  storeRawFile,
} from "../utils/fileStore";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

const isImage = (attachment: StoredPdf): boolean => {
  const type = String(attachment.type || "").toLowerCase();
  const name = String(attachment.name || "");

  return (
    type.startsWith("image/") ||
    /\.(png|jpe?g)$/i.test(name)
  );
};

/**
 * Haalt de daadwerkelijke Blob op.
 *
 * Nieuwe bestanden:
 *   attachment.fileId -> IndexedDB -> Blob
 *
 * Oude bestanden:
 *   attachment.dataUrl -> Blob
 *
 * We ondersteunen beide zodat bestaande reisdata niet verloren gaat.
 */
const getAttachmentBlob = async (
  attachment: StoredPdf
): Promise<Blob> => {
  /*
   * NIEUWE OPSLAG
   *
   * De daadwerkelijke IndexedDB-key staat in fileId.
   */
  if (attachment.fileId) {
    let record = await getFileRecord(attachment.fileId);

    /*
     * Kleine retry voor een eventuele tijdelijke IndexedDB-hapering.
     */
    if (!record) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      record = await getFileRecord(attachment.fileId);
    }

    if (record?.blob) {
      return record.blob;
    }

    throw new Error(
      `Het bestand "${attachment.name}" bestaat niet meer in de lokale opslag.`
    );
  }

  /*
   * LEGACY OPSLAG
   *
   * Voor bestanden uit oudere versies die nog niet gemigreerd zijn.
   */
  if (attachment.dataUrl) {
    try {
      return dataUrlToBlob(attachment.dataUrl);
    } catch {
      throw new Error(
        `Het bestand "${attachment.name}" is beschadigd en kan niet worden geopend.`
      );
    }
  }

  /*
   * Geen fileId én geen oude dataUrl.
   */
  throw new Error(
    `Het bestand "${attachment.name}" heeft geen geldige opslagverwijzing.`
  );
};

/**
 * Leest een bestand en slaat het meteen op in IndexedDB.
 *
 * BELANGRIJK:
 * storeRawFile/storeOptimizedImage geven een StoredFileMeta terug
 * met `id`.
 *
 * StoredPdf gebruikt echter `fileId`.
 *
 * Daarom zetten we hier expliciet:
 *
 *     fileId: meta.id
 *
 * Dit is de cruciale koppeling tussen de attachment en IndexedDB.
 */
export const readPdfFile = async (
  file: File
): Promise<StoredPdf> => {
  const extensionAllowed =
    /\.(pdf|png|jpe?g)$/i.test(file.name);

  if (
    !ACCEPTED_TYPES.includes(file.type) &&
    !extensionAllowed
  ) {
    throw new Error(
      "Kies een PDF-, PNG-, JPG- of JPEG-bestand."
    );
  }

  /*
   * AFBEELDING
   */
  if (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g)$/i.test(file.name)
  ) {
    const meta = await storeOptimizedImage(file);

    if (!meta?.id) {
      throw new Error(
        "De afbeelding is opgeslagen, maar er kon geen opslag-ID worden aangemaakt."
      );
    }

    return {
      ...meta,

      // CRUCIALE FIX:
      fileId: meta.id,

      uploadedAt:
        meta.uploadedAt || new Date().toISOString(),
    };
  }

  /*
   * PDF
   */
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(
      "De PDF is groter dan 25 MB. Verklein het bestand eerst of splits het op."
    );
  }

  const meta = await storeRawFile(file);

  if (!meta?.id) {
    throw new Error(
      "De PDF is opgeslagen, maar er kon geen opslag-ID worden aangemaakt."
    );
  }

  return {
    ...meta,

    // CRUCIALE FIX:
    fileId: meta.id,

    uploadedAt:
      meta.uploadedAt || new Date().toISOString(),
  };
};

const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Onbekende grootte";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

interface Props {
  attachment?: StoredPdf;
  onChange: (attachment?: StoredPdf) => void;
  label?: string;
  compact?: boolean;
}

export const PdfAttachmentControl: React.FC<Props> = ({
  attachment,
  onChange,
  label = "Bestand toevoegen",
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /*
   * Een ref voorkomt dubbele uploads wanneer sommige browsers
   * meerdere change-events kort achter elkaar afvuren.
   */
  const processingRef = useRef(false);

  /**
   * Bestand selecteren en opslaan.
   */
  const handleFile = async (file?: File) => {
    if (!file || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setBusy(true);
    setError("");

    try {
      const storedAttachment = await readPdfFile(file);

      /*
       * Extra controle:
       * een nieuw bestand MOET een fileId hebben.
       */
      if (!storedAttachment.fileId) {
        throw new Error(
          "Het bestand is opgeslagen, maar de koppeling met de lokale opslag ontbreekt."
        );
      }

      /*
       * Nu pas geven we het attachment door aan de app.
       */
      onChange(storedAttachment);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Uploaden is mislukt. Mogelijk is de lokale opslag vol."
      );
    } finally {
      processingRef.current = false;
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  /**
   * Attachment verwijderen.
   */
  const removeAttachment = async () => {
    if (!attachment) {
      return;
    }

    /*
     * Eerst uit de reisdata verwijderen.
     */
    onChange(undefined);

    /*
     * Daarna de daadwerkelijke Blob verwijderen.
     */
    if (attachment.fileId) {
      try {
        await deleteFile(attachment.fileId);
      } catch (cause) {
        console.error(
          "Bestand kon niet worden verwijderd uit de lokale opslag:",
          cause
        );
      }
    }
  };

  /**
   * Bestand openen.
   */
  const openAttachment = async () => {
    if (!attachment) {
      return;
    }

    setError("");

    /*
     * Tabblad onmiddellijk openen binnen de user gesture.
     * Dit voorkomt popup-blokkering op Safari/iOS.
     */
    const newTab = window.open("", "_blank");

    try {
      const blob = await getAttachmentBlob(attachment);

      const objectUrl = URL.createObjectURL(blob);

      if (newTab) {
        newTab.location.href = objectUrl;
      } else {
        window.location.href = objectUrl;
      }

      /*
       * Object URL later opruimen.
       */
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch (cause) {
      newTab?.close();

      setError(
        cause instanceof Error
          ? cause.message
          : "Het bestand kon niet worden geopend."
      );
    }
  };

  /**
   * Bestand downloaden.
   */
  const downloadAttachment = async () => {
    if (!attachment) {
      return;
    }

    setError("");

    let blob: Blob;

    try {
      blob = await getAttachmentBlob(attachment);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Het bestand kon niet worden gevonden."
      );
      return;
    }

    /*
     * Eerst eventueel native share gebruiken.
     */
    const shareableFile = new File(
      [blob],
      attachment.name,
      {
        type:
          attachment.type ||
          blob.type ||
          "application/octet-stream",
      }
    );

    if (
      navigator.share &&
      navigator.canShare?.({
        files: [shareableFile],
      })
    ) {
      try {
        await navigator.share({
          files: [shareableFile],
          title: attachment.name,
        });

        return;
      } catch (cause) {
        /*
         * Annuleren door gebruiker is geen fout.
         */
        if (
          cause instanceof DOMException &&
          cause.name === "AbortError"
        ) {
          return;
        }

        /*
         * Bij een andere share-fout gaan we verder
         * met de normale download.
         */
      }
    }

    /*
     * Normale download.
     */
    try {
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = attachment.name;
      anchor.style.display = "none";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 10_000);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Downloaden is mislukt."
      );
    }
  };

  const Icon =
    attachment && isImage(attachment)
      ? FileImage
      : FileText;

  return (
    <div
      className={
        compact
          ? "space-y-2"
          : "rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,image/png,.png,image/jpeg,.jpg,.jpeg"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />

      {attachment ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Icon
              className={`h-4 w-4 shrink-0 ${
                isImage(attachment)
                  ? "text-cyan-600"
                  : "text-rose-500"
              }`}
            />

            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                {attachment.name}
              </p>

              <p className="text-[10px] text-slate-400">
                {formatSize(attachment.size)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                void openAttachment();
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200"
            >
              <Eye className="h-3.5 w-3.5" />
              Open
            </button>

            <button
              type="button"
              onClick={() => {
                void downloadAttachment();
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>

            <button
              type="button"
              onClick={() => {
                void removeAttachment();
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Verwijder
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#174A7E] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          <Upload className="h-4 w-4 text-[#39B8C8]" />

          {busy
            ? "Bestand verwerken..."
            : label}
        </button>
      )}

      {!attachment && (
        <p className="mt-2 text-[10px] text-slate-500">
          PDF, PNG, JPG of JPEG (max 25 MB)
        </p>
      )}

      {error && (
        <p className="mt-2 text-[11px] font-semibold text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default PdfAttachmentControl;
