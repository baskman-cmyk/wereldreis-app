import React from "react";
import type { StoredPdf } from "../types";
import { PdfAttachmentControl } from "./PdfAttachmentControl";

interface Props {
  attachments?: StoredPdf[];
  legacyAttachment?: StoredPdf;
  onChange: (attachments: StoredPdf[]) => void;
  label?: string;
  maxFiles?: number;
}

export const normalizeAttachments = (attachments?: StoredPdf[], legacyAttachment?: StoredPdf) => {
  const items = [...(attachments || [])];
  const isSame = (item: StoredPdf) => {
    if (item === legacyAttachment) return true;
    if (!legacyAttachment || item.name !== legacyAttachment.name) return false;
    if (legacyAttachment.fileId && item.fileId === legacyAttachment.fileId) return true;
    if (legacyAttachment.dataUrl && item.dataUrl === legacyAttachment.dataUrl) return true;
    // Fallback voor (met name gemigreerde) oudere data: als het losse "legacy"-veld en een
    // item uit de lijst dezelfde naam én bestandsgrootte hebben, is dat vrijwel zeker hetzelfde
    // bestand dat ooit dubbel is opgeslagen (bijv. één keer als los veld, één keer in de lijst).
    // Zonder deze check kan zo'n bestand als "twee PDF's" in de lijst verschijnen.
    if (legacyAttachment.size && item.size === legacyAttachment.size) return true;
    return false;
  };
  if (legacyAttachment && !items.some(isSame)) items.unshift(legacyAttachment);
  // Dedupliceer ook onderling binnen de lijst zelf (kan ontstaan door dezelfde legacy-fallback
  // hierboven op eerdere versies van de data, of door een dubbele upload vóór v2.19.2).
  const deduped: StoredPdf[] = [];
  for (const item of items) {
    const alreadyPresent = deduped.some((existing) =>
      (item.fileId && existing.fileId === item.fileId) ||
      (item.dataUrl && existing.dataUrl === item.dataUrl) ||
      (existing.name === item.name && existing.size === item.size),
    );
    if (!alreadyPresent) deduped.push(item);
  }
  return deduped;
};

export const AttachmentListControl: React.FC<Props> = ({ attachments, legacyAttachment, onChange, label = "Bestand toevoegen", maxFiles = 3 }) => {
  const items = normalizeAttachments(attachments, legacyAttachment).slice(0, maxFiles);
  return <div className="space-y-2">
    {items.map((attachment, index) => <PdfAttachmentControl key={`${attachment.uploadedAt}-${attachment.name}-${index}`} attachment={attachment} compact onChange={(next) => onChange(next ? items.map((item, itemIndex) => itemIndex === index ? next : item) : items.filter((_, itemIndex) => itemIndex !== index))} />)}
    {items.length < maxFiles && <PdfAttachmentControl compact label={items.length ? "Nog een bestand toevoegen" : label} onChange={(attachment) => attachment && onChange([...items, attachment])} />}
    <p className="text-[10px] font-semibold text-slate-400">{items.length} van maximaal {maxFiles} bestanden</p>
  </div>;
};

export default AttachmentListControl;
