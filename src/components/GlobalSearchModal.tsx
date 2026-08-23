import React, { useMemo, useState } from "react";
import { BookOpen, CarFront, FileText, Home, MapPin, Plane, Search, ShieldAlert, Ticket, Wallet, X } from "lucide-react";
import type { TripDataState, TabType } from "../types";

interface Props { isOpen: boolean; onClose: () => void; data: TripDataState; setActiveTab: (tab: TabType) => void; }
interface SearchEntry { id: string; title: string; subtitle: string; tab: TabType; kind: string; searchable: string; }

const text = (...values: unknown[]) => values.filter((value) => value !== undefined && value !== null && value !== "").join(" · ");
const haystack = (value: unknown) => JSON.stringify(value).toLocaleLowerCase("nl-NL");
const iconFor: Record<string, React.ElementType> = { flight: Plane, stay: Home, activity: Ticket, document: FileText, location: MapPin, day: BookOpen, car: CarFront, emergency: ShieldAlert, journal: BookOpen, expense: Wallet };
const labelFor: Record<string, string> = { flight: "Vluchten", stay: "Verblijven", activity: "Activiteiten", document: "Documenten", location: "Locaties", day: "Dagplanning", car: "Autohuur", emergency: "Noodinformatie", journal: "Reisdagboek", expense: "Uitgaven" };

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose, data, setActiveTab }) => {
  const [query, setQuery] = useState("");
  const entries = useMemo<SearchEntry[]>(() => [
    ...data.flights.map((item) => ({ id: `flight-${item.id}`, title: text(item.airline, item.flightNumber) || "Vlucht", subtitle: text(item.departureDate, `${item.fromCode || item.fromCity || ""} → ${item.toCode || item.toCity || ""}`, item.bookingReference), tab: "vluchten", kind: "flight", searchable: haystack(item) })),
    ...data.accommodations.map((item) => ({ id: `stay-${item.id}`, title: item.name || "Verblijf", subtitle: text(item.stad, item.land, item.boekingsnummer || item.bookingReference), tab: "accommodaties", kind: "stay", searchable: haystack(item) })),
    ...data.activities.map((item) => ({ id: `activity-${item.id}`, title: item.name || "Activiteit", subtitle: text(item.date, item.location, item.bookingReference || item.bookingNumber), tab: "activiteiten", kind: "activity", searchable: haystack(item) })),
    ...data.documents.map((item) => ({ id: `document-${item.id}`, title: item.titel || item.title || "Document", subtitle: text(item.categorie || item.category, item.notes), tab: "documenten", kind: "document", searchable: haystack(item) })),
    ...data.savedLocations.map((item) => ({ id: `location-${item.id}`, title: item.naam || item.name || item.title || "Locatie", subtitle: text(item.adres || item.address, item.country), tab: "navigatie", kind: "location", searchable: haystack(item) })),
    ...data.timeline.map((item) => ({ id: `day-${item.id}`, title: text(item.date, item.plaats || item.city) || "Reisdag", subtitle: text(item.land || item.country, item.route, ...(item.activiteiten || []).slice(0, 2)), tab: "timeline", kind: "day", searchable: haystack(item) })),
    ...(data.camper.carRentals || [data.camper.carOption]).filter(Boolean).map((item: any, index) => ({ id: `car-${item.id || index}`, title: text(item.company, item.modelName) || "Autohuur", subtitle: text(item.pickupLocation || item.ophaallocatie, item.bookingReference), tab: "vervoer", kind: "car", searchable: haystack(item) })),
    ...(data.emergencies || []).map((item) => ({ id: `emergency-${item.id}`, title: item.country || "Noodinformatie", subtitle: text(item.generalEmergency, item.embassyName, item.nearestHospital), tab: "nood", kind: "emergency", searchable: haystack(item) })),
    ...data.journals.map((item) => ({ id: `journal-${item.id}`, title: item.title || item.hoogtepunt || item.datum || item.date || "Reisdagboek", subtitle: text(item.plaats || item.location, item.datum || item.date), tab: "dagboek", kind: "journal", searchable: haystack(item) })),
    ...data.budgetExpenses.map((item) => ({ id: `expense-${item.id}`, title: item.description || item.title || "Uitgave", subtitle: text(item.date, item.category, item.country, `€${Number(item.amountEur || 0).toFixed(2)}`), tab: "budget", kind: "expense", searchable: haystack(item) })),
  ], [data]);

  if (!isOpen) return null;
  const q = query.trim().toLocaleLowerCase("nl-NL");
  const results = q ? entries.filter((entry) => entry.searchable.includes(q)).slice(0, 80) : [];
  const groups = results.reduce<Record<string, SearchEntry[]>>((all, entry) => ({ ...all, [entry.kind]: [...(all[entry.kind] || []), entry] }), {});
  const open = (entry: SearchEntry) => { setActiveTab(entry.tab); onClose(); setQuery(""); };

  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 pt-10 backdrop-blur-sm sm:px-4 sm:pt-16">
    <div className="flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800"><Search className="h-5 w-5 shrink-0 text-[#39B8C8]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek vlucht, hotel, boekingsnummer, dag, document…" autoFocus className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" /><button type="button" onClick={onClose} aria-label="Zoeken sluiten" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
      <div className="space-y-5 overflow-y-auto p-4">
        {!q && <div className="py-10 text-center text-sm text-slate-400"><Search className="mx-auto mb-3 h-9 w-9 text-cyan-500" />Zoek in alle reisgegevens, inclusief vluchten, dagplanning, autohuur en noodinformatie.</div>}
        {q && !results.length && <div className="py-10 text-center text-sm text-slate-400">Geen resultaten gevonden voor “{query}”.</div>}
        {Object.entries(groups).map(([kind, items]) => { const Icon = iconFor[kind] || FileText; return <section key={kind}><h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#174A7E] dark:text-[#39B8C8]"><Icon className="h-4 w-4" />{labelFor[kind]} ({items.length})</h3><div className="space-y-2">{items.map((entry) => <button type="button" key={entry.id} onClick={() => open(entry)} className="block w-full rounded-xl bg-slate-50 p-3 text-left transition hover:bg-cyan-50 dark:bg-slate-800/60 dark:hover:bg-slate-800"><strong className="block text-sm text-slate-900 dark:text-white">{entry.title}</strong>{entry.subtitle && <span className="mt-1 block break-words text-xs text-slate-500 dark:text-slate-400">{entry.subtitle}</span>}</button>)}</div></section>; })}
        {results.length === 80 && <p className="text-center text-xs font-bold text-amber-600">Er zijn meer resultaten. Maak je zoekopdracht specifieker.</p>}
      </div>
    </div>
  </div>;
};

export default GlobalSearchModal;
