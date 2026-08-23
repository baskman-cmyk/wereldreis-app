import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, HeartPulse, Pencil, Pill, Plus, Save, Sparkles, Syringe, Trash2, UserPlus, X } from "lucide-react";
import type { FamilyMember, HealthEntry, HealthEntryCategory, StoredPdf } from "../types";
import { PdfAttachmentControl } from "./PdfAttachmentControl";
import { storeOptimizedImage, deleteFile } from "../utils/fileStore";
import { useFileSrc } from "../hooks/useFileSrc";

interface Props { familyMembers: FamilyMember[]; onUpdateFamilyMember: (member: FamilyMember) => void; onAddFamilyMember?: (member: FamilyMember) => void; onDeleteFamilyMember?: (id: string) => void; }
const standardVaccinations = ["DTP", "Hepatitis A", "Hepatitis B", "Buiktyfus", "Gele koorts", "Rabiës", "BMR", "Meningokokken", "Tuberculose", "COVID-19", "Influenza"];
const categories: Array<{ id: HealthEntryCategory; label: string; icon: React.ElementType }> = [
  { id: "medicine", label: "Medicijnen", icon: Pill },
  { id: "allergy", label: "Allergieën", icon: AlertTriangle },
  { id: "supplement", label: "Vitamines & supplementen", icon: Sparkles },
];
const nameOf = (member: FamilyMember) => member.name || member.naam || "Naamloos";
const readImage = async (file: File): Promise<StoredPdf> => {
  if (!file.type.startsWith("image/")) throw new Error("Kies een foto.");
  if (file.size > 40 * 1024 * 1024) throw new Error("De foto is groter dan 40 MB.");
  const meta = await storeOptimizedImage(file);
  return { ...meta };
};

const VaccinationPhoto: React.FC<{ photo: StoredPdf; index: number; onDelete: () => void }> = ({ photo, index, onDelete }) => {
  const src = useFileSrc(photo.fileId, photo.dataUrl);
  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-100">
      {src ? <img src={src} alt={`Vaccinatieboekje ${index + 1}`} className="h-36 w-full object-cover" /> : <div className="h-36 w-full animate-pulse bg-slate-200 dark:bg-slate-700" />}
      <button type="button" onClick={onDelete} className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
};

export const GezondheidView: React.FC<Props> = ({ familyMembers, onUpdateFamilyMember, onAddFamilyMember, onDeleteFamilyMember }) => {
  const [selectedId, setSelectedId] = useState(familyMembers[0]?.id || "");
  const [newPerson, setNewPerson] = useState("");
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string>();
  const [editingVaccinations, setEditingVaccinations] = useState(false);
  const [draftVaccinations, setDraftVaccinations] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ category: HealthEntryCategory; title: string; details: string }>({ category: "medicine", title: "", details: "" });
  useEffect(() => { if (!familyMembers.some((item) => item.id === selectedId)) setSelectedId(familyMembers[0]?.id || ""); }, [familyMembers, selectedId]);
  const current = familyMembers.find((item) => item.id === selectedId) || familyMembers[0];
  const entries = useMemo(() => current?.healthEntries || [], [current]);
  const selectedVaccinations = entries.filter((entry) => entry.category === "vaccination" && entry.completed).map((entry) => entry.title);
  useEffect(() => { setDraftVaccinations(selectedVaccinations); setEditingVaccinations(selectedVaccinations.length === 0); }, [selectedId]);

  const addPerson = (event: React.FormEvent) => {
    event.preventDefault(); const name = newPerson.trim(); if (!name) return;
    const member: FamilyMember = { id: `family-${Date.now()}`, name, naam: name, healthEntries: [] };
    onAddFamilyMember?.(member); setSelectedId(member.id); setNewPerson(""); setShowPersonForm(false);
  };
  const addEntry = (event: React.FormEvent) => {
    event.preventDefault(); if (!current || !draft.title.trim()) return;
    const entry: HealthEntry = { id: editingEntryId || `health-${Date.now()}`, category: draft.category, title: draft.title.trim(), details: draft.details.trim() || undefined };
    onUpdateFamilyMember({ ...current, healthEntries: editingEntryId ? entries.map((item) => item.id === editingEntryId ? entry : item) : [...entries, entry] }); setEditingEntryId(undefined); setDraft({ category: draft.category, title: "", details: "" }); setShowEntryForm(false);
  };
  const updateEntry = (entry: HealthEntry) => current && onUpdateFamilyMember({ ...current, healthEntries: entries.map((item) => item.id === entry.id ? entry : item) });
  const removeEntry = (id: string) => current && onUpdateFamilyMember({ ...current, healthEntries: entries.filter((item) => item.id !== id) });
  const saveVaccinations = () => {
    if (!current) return;
    const other = entries.filter((entry) => entry.category !== "vaccination");
    const vaccinations: HealthEntry[] = draftVaccinations.map((title, index) => ({ id: `vaccination-${Date.now()}-${index}`, category: "vaccination", title, completed: true }));
    onUpdateFamilyMember({ ...current, healthEntries: [...other, ...vaccinations] }); setEditingVaccinations(false);
  };
  const addPhotos = async (files?: FileList | null) => {
    if (!current || !files?.length) return;
    try { setPhotoError(""); const photos = await Promise.all(Array.from(files).map(readImage)); onUpdateFamilyMember({ ...current, vaccinationBookletPhotos: [...(current.vaccinationBookletPhotos || []), ...photos] }); }
    catch (error) { setPhotoError(error instanceof Error ? error.message : "Uploaden is mislukt. Mogelijk is de lokale opslag vol."); }
    if (photoInput.current) photoInput.current.value = "";
  };

  return <div className="space-y-5">
    <header className="rounded-3xl bg-gradient-to-br from-rose-700 to-[#174A7E] p-5 text-white shadow-lg sm:p-7"><h1 className="flex items-center gap-2 text-3xl font-black"><HeartPulse className="h-7 w-7" />Gezondheid</h1></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">{familyMembers.map((member) => <button key={member.id} type="button" onClick={() => setSelectedId(member.id)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-black ${selectedId === member.id ? "bg-[#174A7E] text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{nameOf(member)}</button>)}<button type="button" onClick={() => setShowPersonForm((value) => !value)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"><UserPlus className="h-4 w-4" />Persoon</button></div>
      {showPersonForm && <form onSubmit={addPerson} className="mt-2 flex gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><input autoFocus value={newPerson} onChange={(event) => setNewPerson(event.target.value)} placeholder="Naam van persoon" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" /><button type="submit" className="rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white">Toevoegen</button></form>}
    </section>
    {current && <>
      <div className="grid gap-3 sm:grid-cols-[1fr_15rem_auto] sm:items-end"><h2 className="text-xl font-black">Dossier van {nameOf(current)}</h2><label className="text-sm font-bold">Bloedgroep<input value={current.bloodType || ""} onChange={(event) => onUpdateFamilyMember({ ...current, bloodType: event.target.value })} placeholder="Bijv. O+" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-900" /></label>{onDeleteFamilyMember && <button type="button" onClick={() => window.confirm(`Dossier van ${nameOf(current)} verwijderen?`) && onDeleteFamilyMember(current.id)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-black text-rose-600"><Trash2 className="h-4 w-4" />Verwijder</button>}</div>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-black"><Syringe className="h-5 w-5 text-emerald-600" />Vaccinaties</h3>{!editingVaccinations && <button type="button" onClick={() => { setDraftVaccinations(selectedVaccinations); setEditingVaccinations(true); }} className="flex items-center gap-1 text-xs font-black text-[#174A7E] dark:text-cyan-300"><Pencil className="h-4 w-4" />Aanpassen</button>}</div>
        {editingVaccinations ? <><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{standardVaccinations.map((title) => <label key={title} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold dark:bg-slate-800"><input type="checkbox" checked={draftVaccinations.includes(title)} onChange={() => setDraftVaccinations((items) => items.includes(title) ? items.filter((item) => item !== title) : [...items, title])} className="h-4 w-4" />{title}</label>)}</div><button type="button" onClick={saveVaccinations} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#174A7E] text-sm font-black text-white"><Save className="h-4 w-4" />Vaccinaties opslaan</button></> : <div className="mt-3 flex flex-wrap gap-2">{selectedVaccinations.map((title) => <span key={title} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">✓ {title}</span>)}{!selectedVaccinations.length && <span className="text-sm text-slate-500">Nog geen vaccinaties geselecteerd.</span>}</div>}
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void addPhotos(event.target.files)} /><button type="button" onClick={() => photoInput.current?.click()} className="flex min-h-11 items-center gap-2 rounded-xl bg-cyan-50 px-4 text-sm font-black text-[#174A7E] dark:bg-cyan-950/30 dark:text-cyan-300"><Camera className="h-4 w-4" />Foto vaccinatieboekje toevoegen</button>{photoError && <p className="mt-2 text-xs font-bold text-rose-600">{photoError}</p>}<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{(current.vaccinationBookletPhotos || []).map((photo: StoredPdf, index: number) => <VaccinationPhoto key={`${photo.uploadedAt}-${index}`} photo={photo} index={index} onDelete={() => { onUpdateFamilyMember({ ...current, vaccinationBookletPhotos: (current.vaccinationBookletPhotos || []).filter((_: StoredPdf, itemIndex: number) => itemIndex !== index) }); if (photo.fileId) void deleteFile(photo.fileId).catch((cause) => console.error("Foto kon niet worden verwijderd uit de lokale opslag:", cause)); }} />)}</div></div>
      </section>
      <div className="flex justify-end"><button type="button" onClick={() => { setEditingEntryId(undefined); setDraft({ category: "medicine", title: "", details: "" }); setShowEntryForm(true); }} className="flex h-11 items-center gap-2 rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />Gezondheidsgegeven</button></div>
      <div className="grid gap-4 lg:grid-cols-2">{categories.map((category) => { const Icon = category.icon; const list = entries.filter((entry) => entry.category === category.id); return <section key={category.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"><h3 className="flex items-center gap-2 font-black"><Icon className="h-5 w-5" />{category.label}<span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">{list.length}</span></h3><div className="mt-4 space-y-3">{list.map((entry) => <article key={entry.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-bold">{entry.title}</p>{entry.details && <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{entry.details}</p>}</div><button type="button" onClick={() => { setEditingEntryId(entry.id); setDraft({ category: entry.category, title: entry.title, details: entry.details || "" }); setShowEntryForm(true); }} className="rounded-lg p-2 text-slate-400 hover:text-[#174A7E]"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => removeEntry(entry.id)} className="rounded-lg p-2 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3"><PdfAttachmentControl attachment={entry.document} label="Document toevoegen" onChange={(document) => updateEntry({ ...entry, document })} /></div></article>)}{!list.length && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700">Nog niets toegevoegd</p>}</div></section>; })}</div>
    </>}
    {showEntryForm && current && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center"><form onSubmit={addEntry} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Gezondheidsgegeven toevoegen</h2><button type="button" onClick={() => setShowEntryForm(false)} className="rounded-full p-2"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-bold">Categorie<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as HealthEntryCategory })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-normal dark:border-slate-700">{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="block text-sm font-bold">Naam / onderwerp<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-normal dark:border-slate-700" /></label><label className="block text-sm font-bold">Toelichting<textarea rows={4} value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent p-3 font-normal dark:border-slate-700" /></label></div><button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#174A7E] text-sm font-black text-white">Toevoegen</button></form></div>}
  </div>;
};
export default GezondheidView;
