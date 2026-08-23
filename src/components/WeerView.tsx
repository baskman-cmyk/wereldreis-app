import React, { useEffect, useMemo, useState } from "react";
import { CloudRain, CloudSun, Loader2, MapPin, RefreshCw, Sun, Wind } from "lucide-react";
import type { TimelineDay, WeatherDay, WeatherInfo } from "../types";

interface WeerViewProps { timeline?: TimelineDay[]; }

const weatherLabel = (code?: number) => {
  if (code == null) return "onbekend";
  if (code === 0) return "helder";
  if ([1, 2].includes(code)) return "licht bewolkt";
  if (code === 3) return "bewolkt";
  if ([45, 48].includes(code)) return "mistig";
  if ([51, 53, 55, 56, 57].includes(code)) return "motregen";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "regenachtig";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "sneeuwachtig";
  if ([95, 96, 99].includes(code)) return "onweerachtig";
  return "wisselvallig";
};
const formatDate = (date: string) => new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));
const todayIso = () => new Date().toLocaleDateString("en-CA");
const differenceInDays = (date: string) => Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${todayIso()}T12:00:00`).getTime()) / 86_400_000);

export const WeerView: React.FC<WeerViewProps> = ({ timeline = [] }) => {
  const days = useMemo(() => [...timeline].filter((day) => day.date).sort((a, b) => a.date.localeCompare(b.date)), [timeline]);
  const defaultDay = useMemo(() => days.find((day) => day.date >= todayIso()) || days.at(-1), [days]);
  const [selectedId, setSelectedId] = useState(defaultDay?.id || "");
  const [weather, setWeather] = useState<WeatherInfo>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { if (!days.some((day) => day.id === selectedId)) setSelectedId(defaultDay?.id || ""); }, [days, defaultDay, selectedId]);
  const day = days.find((item) => item.id === selectedId) || defaultDay;
  const locationName = [day?.plaats || day?.city, day?.land || day?.country].filter(Boolean).join(", ") || "reislocatie";
  const daysAway = day ? differenceInDays(day.date) : 999;
  const showCurrentInstead = daysAway < 0 || daysAway > 10;

  useEffect(() => {
    if (!day) { setWeather(undefined); setError("Importeer eerst de reisplanning om een locatie en datum te kiezen."); return; }
    if (!navigator.onLine) { setWeather(undefined); setError("Weer werkt alleen met een internetverbinding."); return; }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError(""); setWeather(undefined);
      try {
        let lat = Number(day.gps?.lat);
        let lng = Number(day.gps?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
          const geocode = new URL("https://geocoding-api.open-meteo.com/v1/search");
          geocode.searchParams.set("name", locationName);
          geocode.searchParams.set("count", "1");
          geocode.searchParams.set("language", "nl");
          const geoResponse = await fetch(geocode, { signal: controller.signal });
          if (!geoResponse.ok) throw new Error("Locatie kon niet worden gevonden");
          const geoResult = await geoResponse.json();
          lat = Number(geoResult?.results?.[0]?.latitude);
          lng = Number(geoResult?.results?.[0]?.longitude);
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Geen coördinaten beschikbaar");
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat)); url.searchParams.set("longitude", String(lng));
        url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code");
        url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset");
        url.searchParams.set("forecast_days", "11"); url.searchParams.set("timezone", "auto");
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Weerservice gaf status ${response.status}`);
        const result = await response.json();
        const dates: string[] = result?.daily?.time || [];
        const forecast: WeatherDay[] = dates.map((date, index) => ({ date, dayName: formatDate(date), tempMax: result.daily.temperature_2m_max?.[index], tempMin: result.daily.temperature_2m_min?.[index], condition: weatherLabel(result.daily.weather_code?.[index]), rainChance: result.daily.precipitation_probability_max?.[index], uvIndex: result.daily.uv_index_max?.[index], sunrise: result.daily.sunrise?.[index], sunset: result.daily.sunset?.[index] }));
        const selectedForecast = forecast.find((item) => item.date === day.date);
        setWeather(showCurrentInstead ? { currentTemp: result.current?.temperature_2m, condition: weatherLabel(result.current?.weather_code), humidity: result.current?.relative_humidity_2m, windKmh: result.current?.wind_speed_10m, forecast14Days: forecast } : { currentTemp: selectedForecast?.tempMax, condition: selectedForecast?.condition, uvIndex: selectedForecast?.uvIndex, rainChance: selectedForecast?.rainChance, forecast14Days: forecast, selectedMin: selectedForecast?.tempMin });
      } catch (cause: any) {
        if (cause?.name !== "AbortError") setError("Actueel weer kon niet worden geladen. Controleer je internetverbinding en probeer opnieuw.");
      } finally { setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [day, locationName, refreshKey, showCurrentInstead]);

  return <div className="space-y-5">
    <header className="rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#23689F] p-5 text-white shadow-lg sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-200"><MapPin className="h-3.5 w-3.5" />{locationName}</p><h1 className="mt-1 text-3xl font-black">Weer per reisdag</h1><p className="mt-2 text-sm text-blue-100">Kies een locatie en datum. Tot 10 dagen vooruit zie je de voorspelling; verder vooruit tonen we het actuele weer op die plek.</p></div><button type="button" disabled={loading || !day} onClick={() => setRefreshKey((value) => value + 1)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-black disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Vernieuwen</button></div></header>
    {days.length > 0 && <label className="block rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold shadow-sm dark:border-slate-800 dark:bg-slate-900">Reisdag<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-normal dark:border-slate-700 dark:bg-slate-800">{days.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.plaats || item.city} · {item.land || item.country}</option>)}</select></label>}
    {error && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</div>}
    {weather && day && <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${showCurrentInstead ? "border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}><p className={`text-sm font-black ${showCurrentInstead ? "text-orange-700 dark:text-orange-300" : "text-sky-700 dark:text-sky-300"}`}>{showCurrentInstead ? `Het huidige weer in ${locationName} is ${weather.currentTemp ?? "–"}° en ${weather.condition || "onbekend"}.` : `Verwachting voor ${locationName} op ${formatDate(day.date)}`}</p><div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-cyan-700 dark:bg-slate-900"><CloudSun className="h-8 w-8" /></div><div><p className="text-4xl font-black">{weather.currentTemp ?? "–"}°</p><p className="capitalize text-sm font-bold text-slate-500">{weather.condition}</p>{!showCurrentInstead && weather.selectedMin != null && <p className="text-xs text-slate-400">Minimum {weather.selectedMin}°</p>}</div></div><div className="grid grid-cols-3 gap-2"><Metric icon={Sun} label="UV" value={weather.uvIndex ?? "–"} /><Metric icon={CloudRain} label="Regen" value={weather.rainChance != null ? `${weather.rainChance}%` : "–"} /><Metric icon={Wind} label="Wind" value={weather.windKmh != null ? `${weather.windKmh} km/u` : "–"} /></div></div></section>}
  </div>;
};

const Metric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => <div className="min-w-20 rounded-xl bg-white/70 p-3 text-center dark:bg-slate-800"><Icon className="mx-auto h-4 w-4 text-[#39B8C8]" /><p className="mt-1 text-[10px] font-black uppercase text-slate-400">{label}</p><p className="text-xs font-black">{value}</p></div>;
export default WeerView;
