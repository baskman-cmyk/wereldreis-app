import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  Home,
  Camera,
  Wallet,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { TimelineDay } from "../types";

interface TimelineViewProps {
  timeline: TimelineDay[];
  onAddDay: (newDay: TimelineDay) => void;
  onUpdateDay: (updated: TimelineDay) => void;
  onDeleteDay: (id: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline = [],
  onAddDay,
  onUpdateDay,
  onDeleteDay,
}) => {
  const [filterLand, setFilterLand] = useState<string>("alle");
  const [draft, setDraft] = useState<TimelineDay>();

  const timelineList = timeline || [];
  const countriesList = Array.from(new Set(timelineList.map((d) => d.land)));

  const filteredTimeline =
    filterLand === "alle"
      ? timelineList
      : timelineList.filter((d) => d.land === filterLand);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#39B8C8]" />
            Tijdlijn van de Reis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Volledig overzicht per reisdag met overnachting, foto's, uitgaven en praktische informatie.
          </p>
        </div>

        {/* Filter per Country */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Filter Land:</label>
          <select
            value={filterLand}
            onChange={(e) => setFilterLand(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <option value="alle">Alle Landen ({timeline.length} Dagen)</option>
            {countriesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setDraft({ id: `day-${Date.now()}`, dayNumber: timeline.length + 1, date: "", land: "", plaats: "", route: "", activiteiten: [], planItems: [], fotos: [], notities: "", uitgaven: [], gps: { lat: 0, lng: 0, label: "" } })} className="flex h-10 items-center gap-1 rounded-xl bg-[#174A7E] px-3 text-xs font-black text-white"><Plus className="h-4 w-4"/>Dag</button>
        </div>
      </div>

      {/* Vertical Timeline Tree */}
      <div className="relative border-l-2 border-[#39B8C8]/40 ml-4 sm:ml-6 space-y-8 pl-6 sm:pl-8">
        {filteredTimeline.map((day) => {
          const totalExpensesEur = day.uitgaven.reduce(
            (sum, u) => sum + u.amountEur,
            0
          );

          return (
            <div key={day.id} className="relative group">
              {/* Day Marker Badge on Line */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-8 h-8 rounded-full bg-[#174A7E] text-white border-2 border-white dark:border-slate-900 flex items-center justify-center font-black text-xs shadow-md">
                {day.dayNumber}
              </div>

              {/* Day Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition">
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <div>
                    <span className="text-xs font-bold text-[#39B8C8] uppercase tracking-wider">
                      {day.date} • {day.land}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                      <MapPin className="w-4 h-4 text-[#174A7E] dark:text-[#39B8C8]" />
                      {day.plaats}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#F3E7C8] dark:bg-slate-800 text-[#174A7E] dark:text-[#39B8C8] text-xs font-bold rounded-full flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5" />
                      {day.overnachting}
                    </span>
                    <button type="button" onClick={() => setDraft(structuredClone(day))} className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-700" aria-label="Reisdag bewerken"><Pencil className="h-4 w-4"/></button>
                    <button type="button" onClick={() => window.confirm(`Reisdag ${day.dayNumber || ""} verwijderen?`) && onDeleteDay(day.id)} className="rounded-xl border border-slate-200 p-2 text-rose-600 dark:border-slate-700" aria-label="Reisdag verwijderen"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </div>

                {/* Activities & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Activiteiten van de dag
                    </h4>
                    <ul className="space-y-1.5">
                      {day.activiteiten.map((act, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Notities & Indrukken
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      "{day.notities}"
                    </p>
                  </div>
                </div>

                {/* Photos Grid */}
                {day.fotos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Foto's ({day.fotos.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {day.fotos.map((imgUrl, idx) => (
                        <img
                          key={idx}
                          src={imgUrl}
                          alt={`Foto Dag ${day.dayNumber}`}
                          className="w-full h-24 object-cover rounded-xl shadow-2xs hover:scale-105 transition"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Expenses & GPS Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <Wallet className="w-4 h-4 text-emerald-600" /> Uitgaven:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        €{totalExpensesEur.toFixed(2)}
                      </strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      GPS: {day.gps.lat.toFixed(4)}, {day.gps.lng.toFixed(4)}
                    </span>
                  </div>

                </div>

                {/* Praktische informatie uit Excel of een handmatige dagnotitie. */}
                {day.samenvatting && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-[#174A7E]/10 to-[#39B8C8]/10 rounded-xl border border-[#39B8C8]/30 text-xs text-[#174A7E] dark:text-[#39B8C8] font-medium">
                    <div>
                      <strong className="block text-slate-900 dark:text-white">
                        Praktische informatie:
                      </strong>
                      <p>{day.samenvatting}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {draft && <DayEditor day={draft} setDay={setDraft} onClose={() => setDraft(undefined)} onSave={() => { const exists = timeline.some((day) => day.id === draft.id); exists ? onUpdateDay(draft) : onAddDay(draft); setDraft(undefined); }}/>} 
    </div>
  );
};

export const DayEditor = ({ day, setDay, onClose, onSave }: { day: TimelineDay; setDay: (day: TimelineDay) => void; onClose: () => void; onSave: () => void }) => {
  const items = day.planItems || [];
  const updateItem = (index: number, patch: any) => setDay({ ...day, planItems: items.map((item: any, i: number) => i === index ? { ...item, ...patch } : item), activiteiten: items.map((item: any, i: number) => (i === index ? { ...item, ...patch } : item).title) });
  const move = (index: number, direction: number) => { const next = [...items]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setDay({ ...day, planItems: next, activiteiten: next.map((item: any) => item.title) }); };
  const add = () => { const next = [...items, { id: `plan-${Date.now()}`, kind: "activity", time: "", title: "Nieuwe activiteit", detail: "" }]; setDay({ ...day, planItems: next, activiteiten: next.map((item: any) => item.title) }); };
  const remove = (index: number) => { const next = items.filter((_: any, i: number) => i !== index); setDay({ ...day, planItems: next, activiteiten: next.map((item: any) => item.title) }); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center"><div className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Reisdag bewerken</h2><button onClick={onClose}><X className="h-5 w-5"/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Edit label="Datum" type="date" value={day.date} change={(date) => setDay({ ...day, date })}/><Edit label="Land" value={day.land || ""} change={(land) => setDay({ ...day, land })}/><Edit label="Plaats" value={day.plaats || ""} change={(plaats) => setDay({ ...day, plaats })}/><Edit label="Route / titel" value={day.route || ""} change={(route) => setDay({ ...day, route })}/><Edit label="Vervoer" value={day.vervoer || ""} change={(vervoer) => setDay({ ...day, vervoer })}/><Edit label="Reistijd" value={day.reistijd || day.travelDuration || ""} change={(reistijd) => setDay({ ...day, reistijd, travelDuration: reistijd })}/><Edit label="Afstand (km)" type="number" value={String(day.afstandKm || day.distanceKm || "")} change={(value) => setDay({ ...day, afstandKm: Number(value), distanceKm: Number(value) })}/><Edit label="Overnachting" value={day.overnachting || ""} change={(overnachting) => setDay({ ...day, overnachting })}/><Edit label="Google Maps-link" type="url" value={day.routeUrl || ""} change={(routeUrl) => setDay({ ...day, routeUrl })} wide/><Edit label="Breedtegraad" type="number" value={String(day.gps?.lat || "")} change={(value) => setDay({ ...day, gps: { lat: Number(value), lng: day.gps?.lng || 0, label: day.plaats || "" } })}/><Edit label="Lengtegraad" type="number" value={String(day.gps?.lng || "")} change={(value) => setDay({ ...day, gps: { lat: day.gps?.lat || 0, lng: Number(value), label: day.plaats || "" } })}/><label className="text-xs font-bold sm:col-span-2">Praktische informatie<textarea rows={3} value={day.samenvatting || ""} onChange={(e) => setDay({ ...day, samenvatting: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal"/></label><label className="text-xs font-bold sm:col-span-2">Notities<textarea rows={3} value={day.notities || ""} onChange={(e) => setDay({ ...day, notities: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal"/></label></div>
    <div className="mt-5 flex items-center justify-between"><h3 className="font-black">Dagactiviteiten</h3><button onClick={add} className="flex h-10 items-center gap-1 rounded-xl bg-cyan-50 px-3 text-xs font-black text-[#174A7E]"><Plus className="h-4 w-4"/>Activiteit</button></div><div className="mt-3 space-y-2">{items.map((item: any, index: number) => <div key={item.id || index} className="grid gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-[6rem_1fr_auto]"><input type="time" value={item.time || ""} onChange={(e) => updateItem(index, { time: e.target.value })} className="h-10 rounded-xl border bg-white px-2 text-sm dark:bg-slate-900"/><div className="grid gap-2"><input value={item.title || ""} onChange={(e) => updateItem(index, { title: e.target.value })} className="h-10 rounded-xl border bg-white px-3 text-sm font-bold dark:bg-slate-900"/><input value={item.detail || ""} onChange={(e) => updateItem(index, { detail: e.target.value })} placeholder="Beschrijving of notitie" className="h-10 rounded-xl border bg-white px-3 text-sm dark:bg-slate-900"/></div><div className="flex sm:flex-col"><button onClick={() => move(index, -1)} className="p-2"><ArrowUp className="h-4 w-4"/></button><button onClick={() => move(index, 1)} className="p-2"><ArrowDown className="h-4 w-4"/></button><button onClick={() => remove(index)} className="p-2 text-rose-600"><Trash2 className="h-4 w-4"/></button></div></div>)}</div>
    <div className="mt-5"><h3 className="font-black">Komoot-routes</h3><p className="mt-1 text-xs text-slate-500">Eén regel per route: Routenaam | https://www.komoot.com/...</p><textarea rows={5} value={(day.komootRoutes || []).map((route) => `${route.title} | ${route.url}`).join("\n")} onChange={(e) => setDay({ ...day, komootRoutes: e.target.value.split(/\n/).flatMap((line, index) => { const match = line.match(/(https?:\/\/\S+)/); return match ? [{ id: `komoot-manual-${index}`, title: line.replace(match[1], "").replace(/[|:–—-]+$/, "").trim() || `Wandeling ${index + 1}`, url: match[1] }] : []; }) })} className="mt-2 w-full rounded-xl border p-3 text-sm"/></div><button onClick={onSave} className="mt-5 h-12 w-full rounded-xl bg-[#174A7E] text-sm font-black text-white">Wijzigingen opslaan</button></div></div>;
};
const Edit = ({ label, value, change, type = "text", wide }: { label: string; value: string; change: (value: string) => void; type?: string; wide?: boolean }) => <label className={`text-xs font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}<input type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(e) => change(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm font-normal"/></label>;
