import React, { useMemo, useState } from 'react';
import { ExternalLink, Footprints, Hotel, MapPin, Pencil, Plane, X } from 'lucide-react';
import type { Accommodation, ActivityItem, Flight, KomootRoute, TimelineDay } from '../types';
import { DayEditor } from './TimelineView';

interface ReisplanningViewProps {
  timeline?: TimelineDay[];
  countries?: any[];
  accommodations?: Accommodation[];
  activities?: ActivityItem[];
  flights?: Flight[];
  savedLocations?: any[];
  setActiveTab?: (tab: string) => void;
  onUpdateDay?: (day: TimelineDay) => void;
}

const getDayItems = (day: TimelineDay) => {
  if (day.dayPlan?.length) return day.dayPlan;
  if (day.items?.length) return day.items;
  return (day.activiteiten || []).map((title, index) => ({
    id: `${day.id}-activity-${index}`,
    title,
    type: 'activity',
  }));
};

export const ReisplanningView: React.FC<ReisplanningViewProps> = ({
  timeline = [],
  accommodations = [],
  activities = [],
  flights = [],
  setActiveTab,
  onUpdateDay,
}) => {
  const [query, setQuery] = useState('');
  const [openDayId, setOpenDayId] = useState<string | null>(timeline[0]?.id ?? null);
  const [walkingDay, setWalkingDay] = useState<TimelineDay | null>(null);
  const [editingDay, setEditingDay] = useState<TimelineDay | null>(null);

  const days = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...timeline]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((day) => {
        if (!normalized) return true;
        return [day.plaats, day.city, day.land, day.country, day.route, day.overnachting]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      });
  }, [timeline, query]);

  if (!timeline.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nog geen reisplanning</h2>
        <p className="mt-2 text-sm text-slate-500">Importeer eerst je Excelbestand via Meer → Importeren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Reisplanning</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Dag voor dag</h1>
            <p className="mt-1 text-sm text-slate-500">{timeline.length} reisdagen · {flights.length} vluchten · {accommodations.length} verblijven</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek plaats, land of route"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 sm:max-w-xs"
          />
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const isOpen = openDayId === day.id;
          const items = getDayItems(day);
          const dayFlights = flights.filter((flight) => flight.departureDate === day.date);
          const dayActivities = activities.filter((activity) => (activity.date || activity.datum) === day.date);
          const accommodation = accommodations.find((item) =>
            day.date >= item.checkIn && day.date < item.checkOut,
          );

          return (
            <article key={day.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setOpenDayId(isOpen ? null : day.id)}
                className="flex w-full items-start gap-3 p-4 text-left sm:gap-4 sm:p-5"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <span className="text-[10px] font-semibold uppercase">Dag</span>
                  <span className="text-lg font-bold leading-none">{day.dayNumber ?? '–'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{day.plaats || day.city || day.route || 'Reisdag'}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{day.date}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{day.land || day.country || ''}{day.route ? ` · ${day.route}` : ''}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {(day.travelDuration || day.reistijd) && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">⏱ {day.travelDuration || day.reistijd}</span>}
                    {(day.distanceKm || day.afstandKm) && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">🚗 {day.distanceKm || day.afstandKm} km</span>}
                    {accommodation && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">🏨 {accommodation.name}</span>}
                  </div>
                </div>
                <span className="mt-1 text-slate-400">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-4 dark:border-slate-800 sm:px-5 sm:pb-5">
                  <div className="space-y-3 border-l-2 border-blue-100 pl-4 dark:border-blue-950 sm:pl-5">
                    {dayFlights.map((flight) => (
                      <div key={flight.id} className="relative rounded-xl bg-sky-50 p-3 dark:bg-sky-950/30">
                        <span className="absolute -left-[33px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white ring-4 ring-white dark:ring-slate-900"><Plane className="h-3.5 w-3.5" /></span>
                        <p className="text-xs font-semibold uppercase text-sky-700">Vlucht</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{flight.fromCode || flight.fromCity} → {flight.toCode || flight.toCity}</p>
                        <p className="text-sm text-slate-500">{flight.departureTime || ''} · {String(flight.flightNumber || '').toUpperCase().startsWith(String(flight.airline || '').toUpperCase()) ? flight.flightNumber : `${flight.airline || ''} ${flight.flightNumber || ''}`.trim()}</p>
                      </div>
                    ))}

                    {items.map((item, index) => (
                      <div key={item.id || `${day.id}-${index}`} className="relative rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                        <div className="flex flex-col items-start gap-1 sm:flex-row sm:gap-3">
                          {(item.startTime || item.time) && <span className="w-12 shrink-0 text-sm font-bold text-blue-700 dark:text-blue-300">{item.startTime || item.time}</span>}
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                            {(item.detail || item.description || item.notes) && <p className="mt-1 text-sm text-slate-500">{item.detail || item.description || item.notes}</p>}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              {item.location && <span>📍 {item.location}</span>}
                              {(item.travelDuration || item.travelTime) && <span>⏱ {item.travelDuration || item.travelTime}</span>}
                              {item.distanceKm && <span>🚗 {item.distanceKm} km</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {dayActivities
                      .filter((activity) => !items.some((item) => item.title?.toLowerCase() === (activity.name || activity.title || '').toLowerCase()))
                      .map((activity) => (
                        <div key={activity.id} className="relative rounded-xl bg-violet-50 p-3 dark:bg-violet-950/30">
                          <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full bg-violet-500 ring-4 ring-white dark:ring-slate-900" />
                          <p className="font-semibold text-slate-900 dark:text-white">{activity.name || activity.title}</p>
                          <p className="text-sm text-slate-500">{activity.time || activity.tijd || ''}{activity.location ? ` · ${activity.location}` : ''}</p>
                        </div>
                      ))}

                    {accommodation && (
                      <div className="relative rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                        <span className="absolute -left-[33px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white dark:ring-slate-900"><Hotel className="h-3.5 w-3.5" /></span>
                        <p className="text-xs font-semibold uppercase text-emerald-700">Overnachting</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{accommodation.name}</p>
                        <p className="text-sm text-slate-500">{accommodation.address || accommodation.adres || accommodation.city || accommodation.stad || ''}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {onUpdateDay && <button type="button" onClick={() => setEditingDay(structuredClone(day))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#174A7E] px-4 py-2 text-sm font-semibold text-white sm:w-auto"><Pencil className="h-4 w-4"/>Dag bewerken</button>}
                    <button type="button" onClick={() => setActiveTab?.('activiteiten')} className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white sm:w-auto">Activiteiten bekijken</button>
                    {day.routeUrl ? <a href={day.routeUrl} target="_blank" rel="noreferrer" className="w-full rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:w-auto">Route van deze dag openen</a> : <button type="button" onClick={() => setActiveTab?.('navigatie')} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:w-auto">Kaart openen</button>}
                    {day.komootRoutes?.length ? <button type="button" onClick={() => setWalkingDay(day)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 sm:w-auto"><Footprints className="h-4 w-4" />Wandelingen ({day.komootRoutes.length})</button> : null}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {walkingDay && <KomootRoutesModal day={walkingDay} routes={walkingDay.komootRoutes || []} onClose={() => setWalkingDay(null)} />}
      {editingDay && <DayEditor day={editingDay} setDay={setEditingDay} onClose={() => setEditingDay(null)} onSave={() => { onUpdateDay?.(editingDay); setEditingDay(null); }}/>} 
    </div>
  );
};

const KomootRoutesModal = ({ day, routes, onClose }: { day: TimelineDay; routes: KomootRoute[]; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={`Wandelingen op ${day.date}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Komoot-routes</p><h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Wandelingen van deze dag</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{day.date} · {day.plaats || day.city || day.route}</p></div>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Sluiten"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-5 space-y-3">
        {routes.map((route, index) => <article key={route.id || route.url} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Footprints className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase text-slate-400">Wandeling {index + 1}</p><h3 className="break-anywhere font-black text-slate-900 dark:text-white">{route.title}</h3></div></div><a href={route.url} target="_blank" rel="noreferrer" className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"><ExternalLink className="h-4 w-4" />Openen in Komoot</a></article>)}
      </div>
    </section>
  </div>
);

export default ReisplanningView;
