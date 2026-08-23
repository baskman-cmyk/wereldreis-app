import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BedDouble, CalendarDays, ExternalLink, LoaderCircle, MapPin, Pencil, Plus, Route, Search, Sparkles, Ticket, Trash2, X } from "lucide-react";
import type { Accommodation, ActivityItem, SavedLocation, TabType, TimelineDay } from "../types";
import { geocodeAddress } from "../utils/geocoding";

type Filter = "all" | "route" | "accommodations" | "activities" | "saved";

interface MapPoint {
  id: string;
  name: string;
  address: string;
  category: Exclude<Filter, "all">;
  gps?: { lat: number; lng: number };
  date?: string;
  target: TabType;
}

interface KaartenViewProps {
  hikes?: any[];
  timeline?: TimelineDay[];
  countryPlans?: any[];
  savedLocations?: SavedLocation[];
  accommodations?: Accommodation[];
  activities?: ActivityItem[];
  onNavigate: (tab: TabType) => void;
  onAddLocation?: (location: SavedLocation) => void;
  onDeleteLocation?: (id: string) => void;
  onUpdateLocation?: (location: SavedLocation) => void;
  onSaveCoordinates?: (category: "accommodations" | "activities" | "saved", id: string, gps: { lat: number; lng: number; label?: string }) => void;
}

const CATEGORY_META = {
  route: { label: "Reisdagen", color: "#174A7E", icon: CalendarDays },
  accommodations: { label: "Accommodaties", color: "#0f9ca8", icon: BedDouble },
  activities: { label: "Activiteiten", color: "#d97706", icon: Ticket },
  saved: { label: "Opgeslagen plekken", color: "#7c3aed", icon: MapPin },
};

const gpsOf = (item: any): { lat: number; lng: number } | undefined => {
  const lat = Number(item?.gps?.lat ?? item?.lat);
  const lng = Number(item?.gps?.lng ?? item?.lng ?? item?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : undefined;
};

const mapsUrl = (point: MapPoint) => {
  const query = point.gps ? `${point.gps.lat},${point.gps.lng}` : point.address || point.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const KaartenView: React.FC<KaartenViewProps> = ({
  timeline = [],
  savedLocations = [],
  accommodations = [],
  activities = [],
  onNavigate,
  onAddLocation,
  onDeleteLocation,
  onUpdateLocation,
  onSaveCoordinates,
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const automaticGeocodingStarted = useRef(false);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: "", address: "", lat: "", lng: "" });
  const [editingLocationId, setEditingLocationId] = useState<string>();
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState("");

  const points = useMemo<MapPoint[]>(() => {
    const dayGps = (date?: string) => gpsOf(timeline.find((day) => day.date === date));
    const routePoints = timeline.map((day) => ({
      id: `route-${day.id}`,
      name: day.plaats || day.city || day.route || `Reisdag ${day.dayNumber || ""}`.trim(),
      address: [day.plaats || day.city, day.land || day.country].filter(Boolean).join(", "),
      category: "route" as const,
      gps: gpsOf(day),
      date: day.date,
      target: "timeline",
    }));
    const accommodationPoints = accommodations.map((item) => ({
      id: `accommodation-${item.id}`,
      name: item.name,
      address: item.address || item.adres || item.location || [item.stad || item.city, item.land || item.country].filter(Boolean).join(", "),
      category: "accommodations" as const,
      gps: gpsOf(item) || dayGps(item.checkIn),
      date: item.checkIn,
      target: "accommodaties",
    }));
    const activityPoints = activities.map((item) => ({
      id: `activity-${item.id}`,
      name: item.title || item.name || "Activiteit",
      address: item.address || item.location || item.plaats || "",
      category: "activities" as const,
      gps: gpsOf(item) || dayGps(item.date || item.datum),
      date: item.date || item.datum,
      target: "activiteiten",
    }));
    const savedPoints = savedLocations.filter((item) => Boolean(item.name || item.title) && Boolean(item.address || item.city || item.country || gpsOf(item))).map((item) => ({
      id: `saved-${item.id}`,
      name: item.name || item.title || "Opgeslagen plek",
      address: item.address || [item.city, item.country].filter(Boolean).join(", "),
      category: "saved" as const,
      gps: gpsOf(item),
      target: "navigatie",
    }));
    return [...routePoints, ...accommodationPoints, ...activityPoints, ...savedPoints];
  }, [timeline, accommodations, activities, savedLocations]);

  const visiblePoints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return points.filter((point) => {
      const categoryMatches = activeFilter === "all" || point.category === activeFilter;
      const searchMatches = !query || `${point.name} ${point.address}`.toLowerCase().includes(query);
      return categoryMatches && searchMatches;
    });
  }, [points, activeFilter, searchQuery]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;
    const map = L.map(mapElementRef.current, { zoomControl: true }).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    window.setTimeout(() => map.invalidateSize(), 50);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const withGps = visiblePoints.filter((point): point is MapPoint & { gps: { lat: number; lng: number } } => Boolean(point.gps));

    withGps.forEach((point) => {
      const color = CATEGORY_META[point.category].color;
      const icon = L.divIcon({
        className: "wereldreis-map-marker",
        html: `<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:999px;background:${color};box-shadow:0 2px 8px rgba(15,23,42,.35)"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = point.name;
      content.appendChild(title);
      if (point.address) {
        const address = document.createElement("div");
        address.textContent = point.address;
        address.style.marginTop = "4px";
        content.appendChild(address);
      }
      const link = document.createElement("a");
      link.href = mapsUrl(point);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open route in Google Maps";
      link.style.display = "block";
      link.style.marginTop = "8px";
      content.appendChild(link);
      L.marker([point.gps.lat, point.gps.lng], { icon }).bindPopup(content).addTo(layer);
    });

    const routeCoordinates = timeline
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map(gpsOf)
      .filter((gps): gps is { lat: number; lng: number } => Boolean(gps))
      .map((gps) => [gps.lat, gps.lng] as L.LatLngTuple);
    if ((activeFilter === "all" || activeFilter === "route") && routeCoordinates.length > 1) {
      L.polyline(routeCoordinates, { color: CATEGORY_META.route.color, weight: 3, opacity: 0.75, dashArray: "8 7" }).addTo(layer);
    }

    if (withGps.length) {
      map.fitBounds(L.latLngBounds(withGps.map((point) => [point.gps.lat, point.gps.lng] as L.LatLngTuple)), { padding: [28, 28], maxZoom: 12 });
    }
  }, [visiblePoints, timeline, activeFilter]);

  const submitLocation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newLocation.name.trim()) return;
    const lat = Number(newLocation.lat);
    const lng = Number(newLocation.lng);
    const location: SavedLocation = {
      id: editingLocationId || `loc-${Date.now()}`,
      name: newLocation.name.trim(),
      address: newLocation.address.trim(),
      gps: Number.isFinite(lat) && Number.isFinite(lng) && newLocation.lat !== "" && newLocation.lng !== "" ? { lat, lng } : undefined,
    };
    editingLocationId ? onUpdateLocation?.(location) : onAddLocation?.(location);
    setEditingLocationId(undefined);
    setNewLocation({ name: "", address: "", lat: "", lng: "" });
    setShowAdd(false);
  };

  const geocodeMissingAddresses = async () => {
    if (!navigator.onLine) { setGeocodeMessage("Internet is nodig om adressen één keer op te zoeken."); return; }
    const candidates = points.filter((point) => point.category !== "route" && !gpsOf(
      point.category === "accommodations" ? accommodations.find((x) => `accommodation-${x.id}` === point.id) :
      point.category === "activities" ? activities.find((x) => `activity-${x.id}` === point.id) :
      savedLocations.find((x) => `saved-${x.id}` === point.id)
    ) && point.address);
    if (!candidates.length) { setGeocodeMessage("Alle adressen hebben al eigen kaartcoördinaten."); return; }
    setGeocoding(true); setGeocodeMessage(`0 van ${candidates.length} adressen gevonden`);
    let found = 0;
    for (let index = 0; index < candidates.length; index += 1) {
      const point = candidates[index];
      try {
        const gps = await geocodeAddress(`${point.name}, ${point.address}`);
        if (gps) { found += 1; onSaveCoordinates?.(point.category as "accommodations" | "activities" | "saved", point.id.replace(/^(accommodation|activity|saved)-/, ""), gps); }
      } catch { /* Eén mislukt adres mag de overige adressen niet blokkeren. */ }
      setGeocodeMessage(`${found} van ${candidates.length} adressen gevonden en offline bewaard`);
      if (index < candidates.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    setGeocoding(false);
  };

  useEffect(() => {
    if (automaticGeocodingStarted.current || !navigator.onLine || !onSaveCoordinates) return;
    automaticGeocodingStarted.current = true;
    void geocodeMissingAddresses();
    // Eenmaal per geopende kaart; opgeslagen resultaten voorkomen werk bij een volgend bezoek.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const geocodedCount = points.filter((point) => point.gps).length;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#23689F] p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Route en locaties</p>
            <h1 className="mt-1 text-3xl font-black">Reiskaart</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              De lijn toont de volgorde van de reis. Pins tonen reisdagen, accommodaties, activiteiten en eigen plekken; vanuit elke kaart open je direct Google Maps.
            </p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="rounded-2xl bg-white/10 px-4 py-2"><strong className="block text-xl">{geocodedCount}</strong><span className="text-[10px] text-blue-100">op kaart</span></div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "route", "accommodations", "activities", "saved"] as Filter[]).map((filter) => (
              <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-xs font-black ${activeFilter === filter ? "bg-[#174A7E] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                {filter === "all" ? `Alles (${points.length})` : `${CATEGORY_META[filter].label} (${points.filter((point) => point.category === filter).length})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 xl:w-72">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Zoek naam of adres" className="h-11 w-full rounded-xl border border-slate-200 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-[#39B8C8] dark:border-slate-700" />
            </label>
            {onAddLocation && <button type="button" onClick={() => { setEditingLocationId(undefined); setNewLocation({ name: "", address: "", lat: "", lng: "" }); setShowAdd(true); }} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#174A7E] px-3 text-sm font-black text-white"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Eigen plek</span></button>}
            {onSaveCoordinates && <button type="button" disabled={geocoding} onClick={geocodeMissingAddresses} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-cyan-600 px-3 text-sm font-black text-white disabled:opacity-60">{geocoding ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}<span className="hidden sm:inline">Adressen op kaart</span></button>}
          </div>
        </div>
      </section>
      {geocodeMessage && <p role="status" className="rounded-xl bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200">{geocodeMessage}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div ref={mapElementRef} className="h-[52dvh] min-h-80 max-h-[38rem] w-full" aria-label="Interactieve reiskaart" />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visiblePoints.filter((point) => Boolean(point.name) && Boolean(point.address || point.gps)).map((point) => {
          const meta = CATEGORY_META[point.category];
          const Icon = meta.icon;
          return (
            <article key={point.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: meta.color }}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{meta.label}{point.date ? ` · ${point.date}` : ""}</p>
                  <h3 className="break-anywhere mt-1 font-black text-slate-900 dark:text-white">{point.name}</h3>
                  {point.address && <p className="break-anywhere mt-1 text-xs leading-5 text-slate-500">{point.address}</p>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onNavigate(point.target)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">Gegevens</button>
                <a href={mapsUrl(point)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">Google Maps <ExternalLink className="h-3 w-3" /></a>
                {point.category === "saved" && onUpdateLocation && <button type="button" onClick={() => { const item = savedLocations.find((location) => `saved-${location.id}` === point.id); if (!item) return; setEditingLocationId(item.id); setNewLocation({ name: item.name || item.title || "", address: item.address || "", lat: String(item.gps?.lat ?? item.lat ?? ""), lng: String(item.gps?.lng ?? item.lng ?? "") }); setShowAdd(true); }} className="flex items-center justify-center gap-1 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-black text-[#174A7E] dark:bg-cyan-950/30"><Pencil className="h-3.5 w-3.5" />Aanpassen</button>}
                {point.category === "saved" && onDeleteLocation && <button type="button" onClick={() => window.confirm(`Plek “${point.name}” verwijderen?`) && onDeleteLocation(point.id.replace(/^saved-/, ""))} className="flex items-center justify-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 dark:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" />Verwijderen</button>}
              </div>
            </article>
          );
        })}
      </section>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Eigen locatie toevoegen">
          <form onSubmit={submitLocation} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">{editingLocationId ? "Eigen plek aanpassen" : "Eigen plek toevoegen"}</h2><button type="button" onClick={() => { setShowAdd(false); setEditingLocationId(undefined); }} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-4">
              <Field label="Naam" required value={newLocation.name} onChange={(value) => setNewLocation((current) => ({ ...current, name: value }))} />
              <Field label="Adres" value={newLocation.address} onChange={(value) => setNewLocation((current) => ({ ...current, address: value }))} />
              <div className="grid grid-cols-2 gap-3"><Field label="Breedtegraad" type="number" value={newLocation.lat} onChange={(value) => setNewLocation((current) => ({ ...current, lat: value }))} /><Field label="Lengtegraad" type="number" value={newLocation.lng} onChange={(value) => setNewLocation((current) => ({ ...current, lng: value }))} /></div>
            </div>
            <button type="submit" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#174A7E] font-black text-white"><Route className="h-4 w-4" />Plek bewaren</button>
          </form>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) => (
  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}<input required={required} type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-normal outline-none focus:border-[#39B8C8] dark:border-slate-700" /></label>
);

export default KaartenView;
