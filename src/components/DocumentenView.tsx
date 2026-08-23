import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  FolderLock,
  HeartPulse,
  IdCard,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { DocumentItem, StoredPdf } from "../types";
import { PdfAttachmentControl } from "./PdfAttachmentControl";
import { deleteFile } from "../utils/fileStore";

interface DocumentenViewProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onUpdateDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
}

type ExpiryStatus = "valid" | "soon" | "expired" | "none";

const categories: Array<{ value: "all" | DocumentItem["categorie"]; label: string }> = [
  { value: "all", label: "Alles" },
  { value: "Paspoort", label: "Paspoorten" },
  { value: "ESTA", label: "ESTA" },
  { value: "Visa", label: "Visa" },
  { value: "Verzekering", label: "Verzekeringen" },
  { value: "Rijbewijs", label: "Rijbewijzen" },
  { value: "Internationaal Rijbewijs", label: "Internationaal rijbewijs" },
  { value: "Vaccinatie", label: "Vaccinaties" },
  { value: "Medicatieverklaring", label: "Medicatie" },
  { value: "Boekingsbevestiging", label: "Boekingen" },
  { value: "Overig", label: "Overig" },
];

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getExpiryStatus = (value?: string): ExpiryStatus => {
  const expiry = parseDate(value);
  if (!expiry) return "none";

  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 180) return "soon";
  return "valid";
};

const formatDate = (value?: string) => {
  const date = parseDate(value);
  if (!date) return "Geen verloopdatum";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const statusStyles: Record<ExpiryStatus, string> = {
  valid: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  soon: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  expired: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  none: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const statusLabels: Record<ExpiryStatus, string> = {
  valid: "Geldig",
  soon: "Binnen 6 maanden",
  expired: "Verlopen",
  none: "Geen verloopdatum",
};

export const DocumentenView: React.FC<DocumentenViewProps> = ({
  documents,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<"all" | DocumentItem["categorie"]>("all");
  const [selectedPerson, setSelectedPerson] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [titel, setTitel] = useState("");
  const [categorie, setCategorie] = useState<DocumentItem["categorie"]>("Paspoort");
  const [person, setPerson] = useState("Gezamenlijk");
  const [vervaldatum, setVervaldatum] = useState("");
  const [notes, setNotes] = useState("");
  const [maatschappij, setMaatschappij] = useState("");
  const [polisnummer, setPolisnummer] = useState("");
  const [alarmnummer, setAlarmnummer] = useState("");
  const [startdatum, setStartdatum] = useState("");
  const [pdfFile, setPdfFile] = useState<StoredPdf | undefined>();

  const people = useMemo(() => {
    const names = documents
      .map((doc) => doc.familyMemberName)
      .filter((name): name is string => Boolean(name));
    return ["Gezamenlijk", ...Array.from(new Set(names.filter((name) => name !== "Gezamenlijk")))];
  }, [documents]);

  const stats = useMemo(() => {
    const statuses = documents.map((doc) => getExpiryStatus(doc.vervaldatum));
    return {
      total: documents.length,
      valid: statuses.filter((status) => status === "valid").length,
      soon: statuses.filter((status) => status === "soon").length,
      expired: statuses.filter((status) => status === "expired").length,
    };
  }, [documents]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documents
      .filter((doc) => selectedCategory === "all" || doc.categorie === selectedCategory)
      .filter((doc) => selectedPerson === "all" || (doc.familyMemberName || "Gezamenlijk") === selectedPerson)
      .filter((doc) => {
        if (!query) return true;
        return [doc.titel, doc.categorie, doc.familyMemberName, doc.notes, doc.bestandsnaam]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const order: Record<ExpiryStatus, number> = { expired: 0, soon: 1, valid: 2, none: 3 };
        return order[getExpiryStatus(a.vervaldatum)] - order[getExpiryStatus(b.vervaldatum)];
      });
  }, [documents, searchQuery, selectedCategory, selectedPerson]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titel.trim()) return;

    onAddDocument({
      id: `doc-${Date.now()}`,
      titel: titel.trim(),
      categorie,
      fileType: "pdf",
      uploadDatum: new Date().toISOString().slice(0, 10),
      vervaldatum: vervaldatum || undefined,
      familyMemberName: person,
      notes: notes.trim(),
      maatschappij: maatschappij.trim() || undefined,
      polisnummer: polisnummer.trim() || undefined,
      alarmnummer: alarmnummer.trim() || undefined,
      startdatum: startdatum || undefined,
      pdfFile,
      bestandsnaam: pdfFile?.name || `${titel.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "_")}.pdf`,
    });

    resetAddForm();
  };

  const resetAddForm = () => {
    setTitel("");
    setCategorie("Paspoort");
    setPerson("Gezamenlijk");
    setVervaldatum("");
    setNotes("");
    setMaatschappij("");
    setPolisnummer("");
    setAlarmnummer("");
    setStartdatum("");
    setPdfFile(undefined);
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    // Een net gekozen bestand dat nooit aan een document is gekoppeld, meteen opruimen in plaats
    // van te wachten tot de achtergrond-opschoning (die zo'n concept-upload bewust 30 minuten
    // met rust laat, zie fileStore.ts) het oppikt.
    if (pdfFile?.fileId) void deleteFile(pdfFile.fileId).catch((cause) => console.error("Concept-bestand kon niet worden opgeruimd:", cause));
    resetAddForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#0f365d] p-4 text-white shadow-lg sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
              <FolderLock className="h-4 w-4" /> Reisdocumentencentrum
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">Alle belangrijke documenten op één plek</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Filter op gezinslid of documentsoort en zie direct welke documenten aandacht nodig hebben.
            </p>
          </div>
          <button
            onClick={() => (showAddForm ? handleCancelAdd() : setShowAddForm(true))}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#39B8C8] px-4 py-3 text-sm font-black text-[#123d67] shadow-sm transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> Document toevoegen
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<FileText className="h-5 w-5" />} label="Documenten" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Geldig" value={stats.valid} tone="emerald" />
        <StatCard icon={<CalendarClock className="h-5 w-5" />} label="Binnen 6 maanden" value={stats.soon} tone="amber" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Verlopen" value={stats.expired} tone="rose" />
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        <Shield className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          De documentgegevens worden lokaal in deze browser bewaard. Voeg voor echte offline toegang alleen bestanden toe die je ook veilig op het apparaat hebt opgeslagen. De huidige demo versleutelt bestanden niet afzonderlijk.
        </p>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Nieuw document</h3>
            <p className="mt-1 text-xs text-slate-500">Leg de belangrijkste gegevens vast en voeg direct een document of afbeelding toe.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              placeholder="Titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
              required
            />
            <select value={categorie} onChange={(e) => setCategorie(e.target.value as DocumentItem["categorie"])} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800">
              {categories.filter((item) => item.value !== "all").map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <select value={person} onChange={(e) => setPerson(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800">
              {people.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <input type="date" value={vervaldatum} onChange={(e) => setVervaldatum(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800" />
            {categorie === "Verzekering" && (
              <>
                <input type="text" placeholder="Verzekeraar / maatschappij" value={maatschappij} onChange={(e) => setMaatschappij(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800" />
                <input type="text" placeholder="Polisnummer" value={polisnummer} onChange={(e) => setPolisnummer(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800" />
                <input type="tel" placeholder="Alarmnummer" value={alarmnummer} onChange={(e) => setAlarmnummer(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800" />
                <input type="date" aria-label="Startdatum verzekering" value={startdatum} onChange={(e) => setStartdatum(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800" />
              </>
            )}
            <textarea
              placeholder="Polisnummer, aanvraagnummer of notitie"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium md:col-span-2 xl:col-span-4 dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="md:col-span-2 xl:col-span-4">
              <PdfAttachmentControl attachment={pdfFile} onChange={setPdfFile} label="Document of afbeelding toevoegen" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleCancelAdd} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500">Annuleren</button>
            <button type="submit" className="rounded-xl bg-[#174A7E] px-4 py-2 text-xs font-bold text-white">Opslaan</button>
          </div>
        </form>
      )}

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {people.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedPerson(name)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${selectedPerson === name ? "bg-[#174A7E] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                <Users className="h-3.5 w-3.5" /> {name}
              </button>
            ))}
            <button
              onClick={() => setSelectedPerson("all")}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${selectedPerson === "all" ? "bg-[#174A7E] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              Iedereen
            </button>
          </div>
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op land, titel, naam of nummer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((item) => (
            <button
              key={item.value}
              onClick={() => setSelectedCategory(item.value)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${selectedCategory === item.value ? "bg-[#39B8C8] text-[#123d67]" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <FileCheck2 className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 font-bold text-slate-800 dark:text-white">Geen documenten gevonden</h3>
          <p className="mt-1 text-xs text-slate-500">Pas de filters aan of voeg een nieuw document toe.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => {
            const status = getExpiryStatus(doc.vervaldatum);
            return (
              <article key={doc.id} className="flex min-h-64 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#174A7E]/10 text-[#174A7E] dark:text-[#39B8C8]">
                      {doc.categorie === "Paspoort" ? <IdCard className="h-5 w-5" /> : doc.categorie === "Medicatieverklaring" || doc.categorie === "Vaccinatie" ? <HeartPulse className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[status]}`}>{statusLabels[status]}</span>
                  </div>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-[#39B8C8]">{doc.categorie}</p>
                  <h3 className="mt-1 text-base font-black leading-snug text-slate-900 dark:text-white">{doc.titel}</h3>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <p><strong className="text-slate-700 dark:text-slate-200">Voor:</strong> {doc.familyMemberName || "Gezamenlijk"}</p>
                    <p><strong className="text-slate-700 dark:text-slate-200">Geldig tot:</strong> {formatDate(doc.vervaldatum)}</p>
                    {doc.maatschappij && <p><strong className="text-slate-700 dark:text-slate-200">Maatschappij:</strong> {doc.maatschappij}</p>}
                    {doc.polisnummer && <p><strong className="text-slate-700 dark:text-slate-200">Polisnummer:</strong> {doc.polisnummer}</p>}
                    {doc.notes && <p className="line-clamp-2"><strong className="text-slate-700 dark:text-slate-200">Notitie:</strong> {doc.notes}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <PdfAttachmentControl
                    attachment={doc.pdfFile}
                    label="Bestand koppelen"
                    compact
                    onChange={(pdfFile) => onUpdateDocument({
                      ...doc,
                      pdfFile,
                      bestandsnaam: pdfFile?.name || doc.bestandsnaam,
                    })}
                  />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button onClick={() => setPreviewDoc(doc)} className="flex items-center gap-1.5 text-xs font-black text-[#174A7E] dark:text-[#39B8C8]"><Eye className="h-4 w-4" /> Bekijken</button><button type="button" onClick={() => window.confirm(`Document “${doc.titel}” verwijderen?`) && onDeleteDocument(doc.id)} className="ml-auto flex items-center gap-1.5 text-xs font-bold text-rose-600"><Trash2 className="h-4 w-4" />Verwijder</button>
                  {!(doc.pdfFile?.fileId || doc.pdfFile?.dataUrl) && (
                    <span className="text-[10px] font-semibold text-slate-400">Nog geen bestand gekoppeld</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4">
          <div className="max-h-[96dvh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#39B8C8]">{previewDoc.categorie}</p>
                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{previewDoc.titel}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs font-bold text-slate-400">Gezinslid</dt><dd className="mt-1 font-bold text-slate-800 dark:text-white">{previewDoc.familyMemberName || "Gezamenlijk"}</dd></div>
                <div><dt className="text-xs font-bold text-slate-400">Vervaldatum</dt><dd className="mt-1 font-bold text-slate-800 dark:text-white">{formatDate(previewDoc.vervaldatum)}</dd></div>
                <div><dt className="text-xs font-bold text-slate-400">Bestandsnaam</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">{previewDoc.bestandsnaam}</dd></div>
                <div><dt className="text-xs font-bold text-slate-400">Toegevoegd</dt><dd className="mt-1 font-bold text-slate-800 dark:text-white">{formatDate(previewDoc.uploadDatum)}</dd></div>
                {previewDoc.maatschappij && <div><dt className="text-xs font-bold text-slate-400">Maatschappij</dt><dd className="mt-1 font-bold text-slate-800 dark:text-white">{previewDoc.maatschappij}</dd></div>}
                {previewDoc.polisnummer && <div><dt className="text-xs font-bold text-slate-400">Polisnummer</dt><dd className="mt-1 font-bold text-slate-800 dark:text-white">{previewDoc.polisnummer}</dd></div>}
                {previewDoc.alarmnummer && <div><dt className="text-xs font-bold text-slate-400">Alarmnummer</dt><dd className="mt-1 font-bold text-slate-800 dark:text-white">{previewDoc.alarmnummer}</dd></div>}
                {previewDoc.startdatum && <div><dt className="text-xs font-bold text-slate-400">Startdatum</dt><dd className="mt-1 font-bold text-slate-800 dark:text-white">{formatDate(previewDoc.startdatum)}</dd></div>}
              </dl>
              {previewDoc.notes && <div className="mt-5 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">{previewDoc.notes}</div>}
            </div>
            {previewDoc.categorie !== "Verzekering" && <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2"><EditField label="Titel" value={previewDoc.titel || ""} onChange={(titel) => setPreviewDoc({ ...previewDoc, titel })}/><label className="text-xs font-bold">Categorie<select value={previewDoc.categorie} onChange={(event) => setPreviewDoc({ ...previewDoc, categorie: event.target.value as DocumentItem["categorie"] })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900">{categories.filter((item) => item.value !== "all").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><EditField label="Gezinslid" value={previewDoc.familyMemberName || "Gezamenlijk"} onChange={(familyMemberName) => setPreviewDoc({ ...previewDoc, familyMemberName })}/><EditField label="Vervaldatum" type="date" value={previewDoc.vervaldatum || ""} onChange={(vervaldatum) => setPreviewDoc({ ...previewDoc, vervaldatum })}/><label className="text-xs font-bold sm:col-span-2">Notities<textarea rows={3} value={previewDoc.notes || ""} onChange={(event) => setPreviewDoc({ ...previewDoc, notes: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900"/></label><button onClick={() => { onUpdateDocument(previewDoc); setPreviewDoc(null); }} className="h-11 rounded-xl bg-[#174A7E] text-sm font-black text-white sm:col-span-2">Wijzigingen opslaan</button></div>}
            {previewDoc.categorie === "Verzekering" && <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2"><EditField label="Verzekeringsmaatschappij" value={previewDoc.maatschappij || previewDoc.verzekeraar || ""} onChange={(maatschappij) => setPreviewDoc({ ...previewDoc, maatschappij })}/><EditField label="Soort verzekering" value={previewDoc.titel || ""} onChange={(titel) => setPreviewDoc({ ...previewDoc, titel })}/><EditField label="Polisnummer" value={previewDoc.polisnummer || ""} onChange={(polisnummer) => setPreviewDoc({ ...previewDoc, polisnummer })}/><EditField label="Prijs" type="number" value={String(previewDoc.prijs || "")} onChange={(value) => setPreviewDoc({ ...previewDoc, prijs: Number(value) })}/><EditField label="Alarmcentrale" value={previewDoc.alarmcentrale || ""} onChange={(alarmcentrale) => setPreviewDoc({ ...previewDoc, alarmcentrale })}/><EditField label="Telefoonnummer" value={previewDoc.alarmnummer || previewDoc.telefoonnummer || ""} onChange={(alarmnummer) => setPreviewDoc({ ...previewDoc, alarmnummer })}/><label className="text-xs font-bold sm:col-span-2">Notities<textarea rows={3} value={previewDoc.notes || ""} onChange={(e) => setPreviewDoc({ ...previewDoc, notes: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900"/></label><button onClick={() => { onUpdateDocument(previewDoc); setPreviewDoc(null); }} className="h-11 rounded-xl bg-[#174A7E] text-sm font-black text-white sm:col-span-2">Wijzigingen opslaan</button></div>}
            <div className="flex justify-end pb-[env(safe-area-inset-bottom)]">
              <button onClick={() => setPreviewDoc(null)} className="w-full rounded-xl bg-[#174A7E] px-4 py-2 text-xs font-black text-white sm:w-auto">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EditField = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <label className="text-xs font-bold">{label}<input type={type} step={type === "number" ? ".01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900"/></label>;

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose";
}> = ({ icon, label, value, tone = "slate" }) => {
  const tones = {
    slate: "text-[#174A7E] bg-blue-50 dark:bg-blue-950/30",
    emerald: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
    amber: "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300",
    rose: "text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-xl p-2 ${tones[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{value}</div>
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
    </div>
  );
};
