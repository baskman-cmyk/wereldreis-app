import React, { useMemo, useState } from "react";
import { Check, ChevronDown, PackageCheck, Pencil, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import type { PackingItem, PackingPerson } from "../types";

interface PaklijstViewProps {
  items?: PackingItem[];
  people?: PackingPerson[];
  onAddPerson?: (person: PackingPerson) => void;
  onDeletePerson?: (id: string) => void;
  onUpdatePerson?: (person: PackingPerson) => void;
  onAddItem?: (item: PackingItem) => void;
  onUpdateItem?: (item: PackingItem) => void;
  onDeleteItem?: (id: string) => void;
  onUpdateStatus?: (id: string, status: string) => void;
}

const DEFAULT_CATEGORIES = ["Kleding", "Jassen & Vesten", "Ondergoed", "Zwemmen", "Sport", "Schoenen", "Toilettas", "Documenten & administratie", "EHBO", "Elektronica", "Overige", "Spullen kinderen"];
const DEFAULT_SUBCATEGORIES = ["Algemeen", "Dagelijks", "Reserve", "Handbagage", "Ruimbagage"];
const PERSONAL_CATEGORIES = ["Kleding", "Jassen & Vesten", "Ondergoed", "Zwemmen", "Sport", "Schoenen", "Toilettas"];
const GENERAL_CATEGORIES = ["EHBO", "Elektronica", "Overige"];
const isPacked = (item: PackingItem) => Boolean(item.completed) || ["packed", "ingepakt", "in koffer", "in camper", "klaar"].includes(String(item.status).toLowerCase());
const assigneeOf = (item: PackingItem, people: PackingPerson[]) => people.find((person) => person.id === item.personId)?.name || item.person || item.toegewezenAan || "Gezamenlijk";

export const PaklijstView: React.FC<PaklijstViewProps> = ({
  items = [],
  people = [],
  onAddPerson,
  onDeletePerson,
  onUpdatePerson,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onUpdateStatus,
}) => {
  const [selectedPerson, setSelectedPerson] = useState(people[0]?.id || "all");
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personName, setPersonName] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem>();
  const [draft, setDraft] = useState({ item: "", personId: people[0]?.id || "", category: "Kleding", subcategory: "Algemeen", notes: "" });

  const visibleItems = useMemo(() => {
    if (selectedPerson === "all") return items;
    const person = people.find((entry) => entry.id === selectedPerson);
    if (!person) return items;
    return items.filter((item) => item.personId === person.id || assigneeOf(item, people).toLowerCase().includes(person.name.toLowerCase()));
  }, [items, people, selectedPerson]);

  const grouped = useMemo(() => {
    const result = new Map<string, Map<string, PackingItem[]>>();
    const selected = people.find((entry) => entry.id === selectedPerson);
    const fixedCategories = selected?.kind === "person"
      ? PERSONAL_CATEGORIES
      : selected?.kind === "general"
        ? GENERAL_CATEGORIES
        : selected?.kind === "children"
          ? ["Spullen kinderen"]
          : [];
    fixedCategories.forEach((category) => result.set(category, new Map()));
    visibleItems.forEach((item) => {
      const category = item.category || item.categorie || "Overig";
      const subcategory = item.subcategory || item.subcategorie || "Algemeen";
      if (!result.has(category)) result.set(category, new Map());
      const categoryGroup = result.get(category)!;
      categoryGroup.set(subcategory, [...(categoryGroup.get(subcategory) || []), item]);
    });
    return result;
  }, [people, selectedPerson, visibleItems]);

  const openNewItem = () => {
    const personId = selectedPerson !== "all" ? selectedPerson : people[0]?.id || "";
    setEditingItem(undefined);
    setDraft({ item: "", personId, category: "Kleding", subcategory: "Algemeen", notes: "" });
    setShowItemForm(true);
  };

  const openEditItem = (item: PackingItem) => {
    setEditingItem(item);
    setDraft({ item: item.item || item.text || "", personId: item.personId || people.find((person) => assigneeOf(item, people).includes(person.name))?.id || "", category: item.category || item.categorie || "Overig", subcategory: item.subcategory || item.subcategorie || "Algemeen", notes: item.notes || "" });
    setShowItemForm(true);
  };

  const saveItem = (event: React.FormEvent) => {
    event.preventDefault();
    const person = people.find((entry) => entry.id === draft.personId);
    const item: PackingItem = {
      ...(editingItem || { id: `pack-${Date.now()}`, status: "Inpakken" }),
      item: draft.item.trim(),
      text: draft.item.trim(),
      personId: person?.id,
      person: person?.name || "Gezamenlijk",
      toegewezenAan: person?.name || "Gezamenlijk",
      category: draft.category.trim() || "Overig",
      categorie: draft.category.trim() || "Overig",
      subcategory: draft.subcategory.trim() || "Algemeen",
      subcategorie: draft.subcategory.trim() || "Algemeen",
      notes: draft.notes.trim() || undefined,
    };
    if (editingItem) onUpdateItem?.(item);
    else onAddItem?.(item);
    setShowItemForm(false);
    setEditingItem(undefined);
  };

  const addPerson = (event: React.FormEvent) => {
    event.preventDefault();
    const name = personName.trim();
    if (!name) return;
    const person: PackingPerson = { id: `packing-person-${Date.now()}`, name, kind: "person" };
    onAddPerson?.(person);
    setSelectedPerson(person.id);
    setDraft((current) => ({ ...current, personId: person.id }));
    setPersonName("");
    setShowPersonForm(false);
  };

  const packedCount = visibleItems.filter(isPacked).length;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#23689F] p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Per persoon, algemeen en kinderen</p><h1 className="mt-1 text-3xl font-black">Paklijst</h1><p className="mt-2 text-sm text-blue-100">Kies een tab en open alleen de categorie die je nodig hebt. Nieuwe categorieën en subcategorieën kun je direct intypen.</p></div>
          <div className="rounded-2xl bg-white/10 px-5 py-3 text-center"><strong className="block text-2xl">{packedCount}/{visibleItems.length}</strong><span className="text-[10px] text-blue-100">ingepakt</span></div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => setSelectedPerson("all")} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-black ${selectedPerson === "all" ? "bg-[#174A7E] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}><Users className="h-4 w-4" />Alles <span className="text-[10px] opacity-70">{items.length}</span></button>
          {people.map((person) => {
            const count = items.filter((item) => item.personId === person.id || assigneeOf(item, people).toLowerCase().includes(person.name.toLowerCase())).length;
            return <div key={person.id} className="flex shrink-0 items-center"><button type="button" onClick={() => setSelectedPerson(person.id)} className={`min-h-11 rounded-l-xl px-3 text-sm font-black ${selectedPerson === person.id ? "bg-[#174A7E] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{person.name} <span className="ml-1 text-[10px] opacity-70">{count}</span></button>{onUpdatePerson && <button type="button" onClick={() => { const name = window.prompt("Naam aanpassen", person.name)?.trim(); if (name) onUpdatePerson({ ...person, name }); }} className="min-h-11 bg-cyan-50 px-2 text-[#174A7E] dark:bg-cyan-950/30" aria-label={`${person.name} aanpassen`}><Pencil className="h-4 w-4" /></button>}{onDeletePerson && <button type="button" onClick={() => window.confirm(`${person.name} en diens paklijstitems verwijderen?`) && onDeletePerson(person.id)} className="min-h-11 rounded-r-xl bg-rose-50 px-2 text-rose-600 dark:bg-rose-950/30" aria-label={`${person.name} verwijderen`}><Trash2 className="h-4 w-4" /></button>}</div>;
          })}
          <button type="button" onClick={() => setShowPersonForm((value) => !value)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"><UserPlus className="h-4 w-4" />Persoon</button>
        </div>
        {showPersonForm && <form onSubmit={addPerson} className="mt-2 flex gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><input autoFocus value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Naam van persoon" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" /><button type="submit" className="rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white">Toevoegen</button></form>}
      </section>

      <div className="flex justify-end"><button type="button" onClick={openNewItem} className="flex h-11 items-center gap-2 rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />Spul toevoegen</button></div>

      {grouped.size ? (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([category, subgroups], categoryIndex) => {
            const categoryItems = Array.from(subgroups.values()).flat();
            const categoryPacked = categoryItems.filter(isPacked).length;
            return (
              <details key={category} open={categoryIndex === 0} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3"><ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" /><div className="min-w-0 flex-1"><h2 className="font-black text-slate-900 dark:text-white">{category}</h2><p className="text-xs text-slate-500">{categoryPacked} van {categoryItems.length} ingepakt</p></div><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-emerald-500" style={{ width: `${categoryItems.length ? (categoryPacked / categoryItems.length) * 100 : 0}%` }} /></div></summary>
                <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                  {subgroups.size === 0 && <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500 dark:bg-slate-800/60">Nog geen items. Gebruik <strong>Spul toevoegen</strong> en kies deze categorie.</p>}
                  {Array.from(subgroups.entries()).map(([subcategory, subItems]) => (
                    <section key={subcategory} className="mb-4 last:mb-0"><h3 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400">{subcategory}</h3><div className="space-y-2">{subItems.map((item) => {
                      const packed = isPacked(item);
                      return <div key={item.id} className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><button type="button" onClick={() => onUpdateStatus?.(item.id, packed ? "Inpakken" : "Ingepakt")} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${packed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"}`} aria-label={packed ? "Markeer als niet ingepakt" : "Markeer als ingepakt"}>{packed && <Check className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><p className={`break-anywhere text-sm font-bold ${packed ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"}`}>{item.item || item.text}</p><p className="mt-0.5 text-[10px] text-slate-400">{assigneeOf(item, people)}</p></div>{onUpdateItem && <button type="button" onClick={() => openEditItem(item)} className="rounded-lg p-2 text-slate-400 hover:text-[#174A7E]" aria-label="Aanpassen"><Pencil className="h-4 w-4" /></button>}{onDeleteItem && <button type="button" onClick={() => onDeleteItem(item.id)} className="rounded-lg p-2 text-slate-400 hover:text-rose-600" aria-label="Verwijderen"><Trash2 className="h-4 w-4" /></button>}</div>;
                    })}</div></section>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><PackageCheck className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-black">Nog niets op deze lijst</h2><p className="mt-1 text-sm text-slate-500">Voeg het eerste item voor deze persoon toe.</p></div>}

      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Paklijstitem bewerken">
          <form onSubmit={saveItem} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">{editingItem ? "Spul aanpassen" : "Spul toevoegen"}</h2><button type="button" onClick={() => setShowItemForm(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Wat neem je mee?" value={draft.item} onChange={(value) => setDraft({ ...draft, item: value })} required wide />
              <label className="text-sm font-bold">Persoon<select value={draft.personId} onChange={(event) => setDraft({ ...draft, personId: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-normal dark:border-slate-700"><option value="">Gezamenlijk</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
              <Field label="Categorie" list="packing-categories" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
              <Field label="Subcategorie" list="packing-subcategories" value={draft.subcategory} onChange={(value) => setDraft({ ...draft, subcategory: value })} />
              <Field label="Notitie" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} wide />
            </div>
            <datalist id="packing-categories">{DEFAULT_CATEGORIES.map((value) => <option key={value} value={value} />)}</datalist><datalist id="packing-subcategories">{DEFAULT_SUBCATEGORIES.map((value) => <option key={value} value={value} />)}</datalist>
            <button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#174A7E] text-sm font-black text-white">{editingItem ? "Wijzigingen opslaan" : "Toevoegen aan paklijst"}</button>
          </form>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, required, wide, list }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; wide?: boolean; list?: string }) => <label className={`text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}<input required={required} list={list} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-normal outline-none focus:border-[#39B8C8] dark:border-slate-700" /></label>;

export default PaklijstView;
