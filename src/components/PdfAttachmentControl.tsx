import React, { useRef, useState } from "react";
import { Download, Eye, FileImage, FileText, Trash2, Upload } from "lucide-react";
import { StoredPdf } from "../types";
import { dataUrlToBlob, deleteFile, getFileRecord, storeOptimizedImage, storeRawFile } from "../utils/fileStore";

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const isImage = (attachment: StoredPdf) => String(attachment.type || "").startsWith("image/") || /\.(png|jpe?g)$/i.test(attachment.name);

/** Haalt de Blob van een bijlage op, of het nu (nieuw) in IndexedDB of (legacy, nog niet gemigreerd) als dataURL staat. */
const getAttachmentBlob = async (attachment: StoredPdf): Promise<Blob> => {
  if (attachment.fileId) {
    // Eén korte herhaalpoging: een enkele kortstondige IndexedDB-hapering (bijv. vlak na een
    // upload) mag niet meteen als "bestand definitief weg" worden gemeld.
    let record = await getFileRecord(attachment.fileId);
    if (!record) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      record = await getFileRecord(attachment.fileId);
    }
    if (record) return record.blob;
    throw new Error("Dit bestand is niet meer beschikbaar in de lokale opslag.");
  }
  if (attachment.dataUrl) return dataUrlToBlob(attachment.dataUrl);
  throw new Error("Dit bestand kon niet worden gevonden.");
};

export const readPdfFile = async (file: File): Promise<StoredPdf> => {
  const extensionAllowed = /\.(pdf|png|jpe?g)$/i.test(file.name);
  if (!ACCEPTED_TYPES.includes(file.type) && !extensionAllowed) throw new Error("Kies een PDF-, PNG-, JPG- of JPEG-bestand.");
  if (file.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(file.name)) {
    const meta = await storeOptimizedImage(file);
    return { ...meta, uploadedAt: meta.uploadedAt };
  }
  if (file.size > MAX_PDF_BYTES) throw new Error("De PDF is groter dan 25 MB. Verklein het bestand eerst of splits het op.");
  const meta = await storeRawFile(file);
  return { ...meta, uploadedAt: meta.uploadedAt };
};

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface Props { attachment?: StoredPdf; onChange: (attachment?: StoredPdf) => void; label?: string; compact?: boolean; }

export const PdfAttachmentControl: React.FC<Props> = ({ attachment, onChange, label = "Bestand toevoegen", compact = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Ref i.p.v. alleen de `busy`-state: een state-update wordt pas bij de volgende render
  // zichtbaar, dus als het bestandsveld (bijv. door een dubbel 'change'-event op sommige
  // mobiele browsers) tweemaal vlak na elkaar afvuurt, zou de `busy`-check hieronder de
  // tweede aanroep nog als "niet bezig" lezen. Deze ref is synchroon en voorkomt dat er
  // per ongeluk twee keer hetzelfde bestand wordt opgeslagen (en dus dubbel in de lijst komt).
  const processingRef = useRef(false);

  const handleFile = async (file?: File) => {
    if (!file || processingRef.current) return;
    processingRef.current = true;
    setBusy(true); setError("");
    try { onChange(await readPdfFile(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Uploaden is mislukt. Mogelijk is de lokale opslag vol."); }
    finally { processingRef.current = false; setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };
  const removeAttachment = async () => {
    if (!attachment) return;
    onChange(undefined);
    // Meteen de daadwerkelijke Blob verwijderen — anders blijft die onnodig ruimte innemen
    // in IndexedDB, ook al is de bijlage al uit de reisdata verdwenen.
    if (attachment.fileId) {
      try { await deleteFile(attachment.fileId); } catch (cause) { console.error("Bestand kon niet worden verwijderd uit de lokale opslag:", cause); }
    }
  };
  const openAttachment = async () => {
    if (!attachment) return;
    // Belangrijk: window.open() moet synchroon binnen de klik gebeuren, vóór enige `await`.
    // Browsers (met name Safari/iOS) koppelen "mag een popup/tab openen" aan het klikmoment
    // zelf; zodra er een async gat (zoals het uit IndexedDB lezen van de Blob) tussen de klik
    // en window.open() zit, wordt dat stilletjes geblokkeerd — zonder foutmelding, er gebeurt
    // dan gewoon niets. Door alvast een leeg tabblad te openen en pas ná het laden van het
    // bestand de locatie te zetten, blijft dit binnen het "user gesture" van de klik.
    const newTab = window.open("", "_blank");
    try {
      const objectUrl = URL.createObjectURL(await getAttachmentBlob(attachment));
      if (newTab) newTab.location.href = objectUrl; else window.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (cause) {
      newTab?.close();
      setError(cause instanceof Error ? cause.message : "Openen is mislukt.");
    }
  };
  const downloadAttachment = async () => {
    if (!attachment) return;
    let blob: Blob;
    try {
      blob = await getAttachmentBlob(attachment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Downloaden is mislukt.");
      return;
    }
    // navigator.share() vereist óók een user gesture; door de hierboven al genomen `await`
    // (IndexedDB-lezing) kan die inmiddels verlopen zijn, waardoor share() stilletjes weigert.
    // Dat mag de betrouwbare download-methode hieronder nooit blokkeren — dus share is hier
    // alleen een optionele extra, nooit de enige poging.
    const shareableFile = new File([blob], attachment.name, { type: attachment.type || blob.type });
    if (navigator.share && navigator.canShare?.({ files: [shareableFile] })) {
      try {
        await navigator.share({ files: [shareableFile], title: attachment.name });
        return;
      } catch (cause) {
        if ((cause as DOMException)?.name === "AbortError") return; // gebruiker heeft het deelvenster zelf geannuleerd
        // Val door naar de gewone download hieronder in plaats van hier te stoppen met een foutmelding.
      }
    }
    try {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = attachment.name; anchor.style.display = "none";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Downloaden is mislukt.");
    }
  };

  const Icon = attachment && isImage(attachment) ? FileImage : FileText;
  return <div className={compact ? "space-y-2" : "rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"}>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf,image/png,.png,image/jpeg,.jpg,.jpeg" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
    {attachment ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${isImage(attachment) ? "text-cyan-600" : "text-rose-500"}`} /><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800 dark:text-white">{attachment.name}</p><p className="text-[10px] text-slate-400">{formatSize(attachment.size)}</p></div></div>
      <div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => void openAttachment()} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200"><Eye className="h-3.5 w-3.5" />Open</button><button type="button" onClick={() => void downloadAttachment()} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200"><Download className="h-3.5 w-3.5" />Download</button><button type="button" onClick={() => void removeAttachment()} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 dark:bg-rose-950/30 dark:text-rose-300"><Trash2 className="h-3.5 w-3.5" />Verwijder</button></div>
    </div> : <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#174A7E] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4 text-[#39B8C8]" />{busy ? "Bestand verwerken..." : label}</button>}
    {!attachment && <p className="mt-2 text-[10px] text-slate-500">PDF, PNG, JPG of JPEG (max 25 MB)</p>}
    {error && <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p>}
  </div>;
};

export default PdfAttachmentControl;
