import React, { useMemo, useState } from "react";
import { CheckSquare, Check, Search, Plane, ArrowRightLeft, AlertTriangle, Circle, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { ChecklistItem } from "../types";

interface ChecklistViewProps {
  checklists: ChecklistItem[];
  onToggleCheckItem: (groupId: string, itemId: string) => void;
  onAddCheckItem: (item: ChecklistItem) => void;
  onDeleteCheckItem: (id: string) => void;
  onUpdateCheckItem: (item: ChecklistItem) => void;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({ checklists, onToggleCheckItem, onAddCheckItem: addCheckItem, onDeleteCheckItem, onUpdateCheckItem }) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["pre-departure"]);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ text: "", category: "pre-departure", countryScope: "" });
  const [editingId, setEditingId] = useState<string>();
  const onAddCheckItem = (item: ChecklistItem) => {
    if (editingId) onUpdateCheckItem({ ...item, id: editingId });
    else addCheckItem(item);
    setEditingId(undefined);
  };

  const countries = useMemo(
    () => ["all", ...Array.from(new Set(checklists.map((item) => item.countryScope).filter(Boolean) as string[]))],
    [checklists]
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return checklists.filter((item) => {
      const categoryMatches = activeCategory === "all" || item.category === activeCategory;
      const countryMatches = countryFilter === "all" || item.countryScope === countryFilter;
      const completionMatches = showCompleted || !item.completed;
      const queryMatches = !query || item.text.toLowerCase().includes(query) || item.countryScope?.toLowerCase().includes(query);
      return categoryMatches && countryMatches && completionMatches && queryMatches;
    });
  }, [activeCategory, checklists, countryFilter, searchQuery, showCompleted]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ChecklistItem[]>();
    filtered.forEach((item) => {
      const label = item.category === "pre-departure" ? "Voor vertrek" : (item.countryScope || "Landovergangen");
      groups.set(label, [...(groups.get(label) || []), item]);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  const toggleGroup = (label: string) => setOpenGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);

  const completedCount = checklists.filter((item) => item.completed).length;
  const openCount = checklists.length - completedCount;
  const progress = checklists.length ? Math.round((completedCount / checklists.length) * 100) : 0;
  const departureOpen = checklists.filter((item) => item.category === "pre-departure" && !item.completed).length;
  const transitionOpen = checklists.filter((item) => item.category === "country-transition" && !item.completed).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <section className="rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#245f8f] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9ee8ef]">Acties & deadlines</p>
            <h2 className="flex items-center gap-3 text-2xl font-black"><CheckSquare className="h-7 w-7 text-[#56d2df]" /> Reischecklists</h2>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">Alle belangrijke handelingen voor vertrek en bij de overgang naar een volgend land.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right backdrop-blur-sm">
            <div className="text-3xl font-black">{progress}%</div>
            <div className="text-xs font-bold text-blue-100">{completedCount} van {checklists.length} voltooid</div>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#56d2df]" style={{ width: `${progress}%` }} /></div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button onClick={() => setActiveCategory("all")} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Circle className="h-5 w-5 text-[#39B8C8]" />
          <div className="mt-4 text-2xl font-black text-slate-900 dark:text-white">{openCount}</div>
          <div className="text-xs font-bold text-slate-500">Openstaande acties</div>
        </button>
        <button onClick={() => setActiveCategory("pre-departure")} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Plane className="h-5 w-5 text-[#174A7E] dark:text-[#56d2df]" />
          <div className="mt-4 text-2xl font-black text-slate-900 dark:text-white">{departureOpen}</div>
          <div className="text-xs font-bold text-slate-500">Voor vertrek</div>
        </button>
        <button onClick={() => setActiveCategory("country-transition")} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ArrowRightLeft className="h-5 w-5 text-[#174A7E] dark:text-[#56d2df]" />
          <div className="mt-4 text-2xl font-black text-slate-900 dark:text-white">{transitionOpen}</div>
          <div className="text-xs font-bold text-slate-500">Landovergangen</div>
        </button>
      </section>

      {openCount > 0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div><h3 className="text-sm font-black text-amber-950 dark:text-amber-100">Nog {openCount} acties open</h3><p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Rond vooral visa, paspoorten, medicatieverklaringen en betaalmiddelen ruim voor vertrek af.</p></div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Zoek actie of land" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="all">Alle fases</option><option value="pre-departure">Voor vertrek</option><option value="country-transition">Landovergangen</option></select>
          <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="all">Alle landen</option>{countries.filter((country) => country !== "all").map((country) => <option key={country}>{country}</option>)}</select>
          <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} className="accent-[#174A7E]" /> Toon voltooid</label>
        </div>
      </section>
      <div className="flex justify-end"><button type="button" onClick={() => { setEditingId(undefined); setDraft({ text: "", category: "pre-departure", countryScope: "" }); setShowAdd(true); }} className="flex h-11 items-center gap-2 rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />Actie toevoegen</button></div>

      <section className="space-y-3">
        {grouped.map(([label, items]) => {
          const isOpen = openGroups.includes(label) || grouped.length === 1;
          const done = items.filter((item) => item.completed).length;
          return (
            <div key={label} className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <button onClick={() => toggleGroup(label)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <div className="min-w-0 flex-1"><p className="font-black text-slate-900 dark:text-white">{label}</p><p className="text-xs font-semibold text-slate-500">{done} van {items.length} voltooid</p></div>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-[#39B8C8]" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} /></div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
                  {items.map((item) => (
                    <div key={item.id} className={`flex w-full items-start gap-2 rounded-2xl border p-2 transition ${item.completed ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"}`}><button onClick={() => onToggleCheckItem(item.category, item.id)} className="flex min-w-0 flex-1 items-start gap-3 p-1 text-left">
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${item.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"}`}>{item.completed && <Check className="h-4 w-4" />}</span>
                      <span className="min-w-0 flex-1"><span className={`block text-sm font-bold text-slate-900 dark:text-white ${item.completed ? "line-through opacity-65" : ""}`}>{item.text}</span>{item.countryScope && <span className="mt-1 block text-[10px] font-bold uppercase text-slate-400">{item.countryScope}</span>}</span>
                    </button><button type="button" onClick={() => { setEditingId(item.id); setDraft({ text: item.text || "", category: item.category || "pre-departure", countryScope: item.countryScope || "" }); setShowAdd(true); }} className="rounded-xl p-2 text-[#174A7E]" aria-label="Actie aanpassen"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => window.confirm(`Actie “${item.text}” verwijderen?`) && onDeleteCheckItem(item.id)} className="rounded-xl p-2 text-rose-600" aria-label="Actie verwijderen"><Trash2 className="h-4 w-4" /></button></div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {!filtered.length && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">Geen checklistpunten gevonden met deze filters.</div>}
      {showAdd && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center"><form onSubmit={(event) => { event.preventDefault(); if (!draft.text.trim()) return; onAddCheckItem({ id: `check-${Date.now()}`, text: draft.text.trim(), category: draft.category, countryScope: draft.countryScope.trim() || undefined, completed: false }); setDraft({ text: "", category: "pre-departure", countryScope: "" }); setShowAdd(false); }} className="w-full max-w-lg rounded-3xl bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Checklistactie toevoegen</h2><button type="button" onClick={() => setShowAdd(false)} className="rounded-xl p-2"><X className="h-5 w-5" /></button></div><div className="mt-4 grid gap-3"><label className="text-sm font-bold">Actie<input autoFocus required value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label><label className="text-sm font-bold">Fase<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 dark:border-slate-700"><option value="pre-departure">Voor vertrek</option><option value="country-transition">Landovergang</option></select></label><label className="text-sm font-bold">Land (optioneel)<input value={draft.countryScope} onChange={(event) => setDraft({ ...draft, countryScope: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label></div><button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#174A7E] font-black text-white">Opslaan</button></form></div>}
    </div>
  );
};
