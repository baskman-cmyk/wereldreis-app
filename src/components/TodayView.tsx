import React, { useMemo, useState } from "react";
import {
  BedDouble,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  FileText,
  MapPin,
  Navigation,
  Plane,
  Route,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import { TabType, TimelineDay, TripDataState } from "../types";

interface TodayViewProps {
  data: TripDataState;
  setActiveTab: (tab: TabType) => void;
}

const getLocalIsoDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const dateOnly = (value: string) => value.slice(0, 10);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const flightLabel = (airline?: string, flightNumber?: string) => {
  const company = String(airline || "").trim();
  const number = String(flightNumber || "").trim();
  if (!company) return number;
  if (number.toUpperCase().startsWith(company.toUpperCase())) return number;
  return [company, number].filter(Boolean).join(" ");
};

const timeFromText = (value: string) => value.match(/^\s*(\d{1,2}[.:]\d{2})\b/)?.[1]?.replace(".", ":");

const findInitialDayIndex = (days: TimelineDay[], currentDay: number) => {
  const today = getLocalIsoDate();
  const exactToday = days.findIndex((item) => item.date === today);
  if (exactToday >= 0) return exactToday;

  const configuredDay = days.findIndex((item) => item.dayNumber === currentDay);
  if (configuredDay >= 0) return configuredDay;

  const nextDay = days.findIndex((item) => item.date >= today);
  return nextDay >= 0 ? nextDay : Math.max(0, days.length - 1);
};

export const TodayView: React.FC<TodayViewProps> = ({ data, setActiveTab }) => {
  const sortedDays = useMemo(
    () => [...data.timeline].sort((a, b) => a.date.localeCompare(b.date)),
    [data.timeline],
  );
  const [selectedIndex, setSelectedIndex] = useState(() =>
    findInitialDayIndex(sortedDays, data.overview.currentDay),
  );

  if (!sortedDays.length) {
    return (
      <EmptyState
        title="Nog geen reisdag beschikbaar"
        text="Voeg eerst een dag toe aan de reisplanning. Daarna verschijnt hier automatisch je dagoverzicht."
        onClick={() => setActiveTab("timeline")}
      />
    );
  }

  const safeIndex = Math.min(selectedIndex, sortedDays.length - 1);
  const day = sortedDays[safeIndex];
  const previousDay = sortedDays[safeIndex - 1];
  const nextDay = sortedDays[safeIndex + 1];
  const today = getLocalIsoDate();
  const isActualToday = day.date === today;

  const accommodation = data.accommodations.find(
    (item) => day.date >= dateOnly(item.checkIn) && day.date < dateOnly(item.checkOut),
  ) || data.accommodations.find(
    (item) => String(item.stad || item.city || "").toLowerCase().includes(String(day.plaats || day.city || "").toLowerCase().split(",")[0]),
  );
  const flight = data.flights.find((item) => item.departureDate === day.date);
  const activityMatches = data.activities.filter((item) => {
    if (item.date) return item.date === day.date;
    return item.land === day.land && (
      String(item.location || item.plaats || "").toLowerCase().includes(String(day.plaats || day.city || "").toLowerCase().split(",")[0])
      || day.activiteiten.some((name) => name.toLowerCase().includes(String(item.name || item.title || "").toLowerCase()))
    );
  });
  const expenses = data.budgetExpenses.filter((item) => item.date === day.date);
  const daySpend = expenses.reduce((sum, item) => sum + item.amountEur, 0);
  const photos = data.photos.filter((item) => item.datum === day.date);
  const journal = data.journals.find((item) => item.datum === day.date);
  const countryChecklist = data.checklists.filter(
    (item) => !item.completed && (!item.countryScope || item.countryScope === day.land),
  );
  const relevantDocuments = data.documents.filter((item) =>
    item.categorie === "Boekingsbevestiging"
    || item.categorie === "Verzekering"
    || item.categorie === "Medicatieverklaring",
  );
  const plannedItems = (day.planItems || day.dayPlan || []).filter((item) => item.kind !== "flight" && item.type !== "flight");

  const routeLabel = nextDay
    ? `${day.plaats} → ${nextDay.plaats}`
    : `Verblijf in ${day.plaats}`;

  const shortcuts = [
    { label: "Route openen", icon: Navigation, tab: "navigatie" as TabType },
    { label: "Foto toevoegen", icon: Camera, tab: "dagboek" as TabType },
    { label: "Dagboek schrijven", icon: BookOpen, tab: "dagboek" as TabType },
    { label: "Uitgave toevoegen", icon: Wallet, tab: "budget" as TabType },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <section className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!previousDay}
          onClick={() => setSelectedIndex((index) => Math.max(0, index - 1))}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Vorige dag</span>
        </button>

        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {isActualToday ? "Vandaag" : "Geselecteerde reisdag"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
            Dag {day.dayNumber} van {data.overview.totalDays}
          </p>
        </div>

        <button
          type="button"
          disabled={!nextDay}
          onClick={() => setSelectedIndex((index) => Math.min(sortedDays.length - 1, index + 1))}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <span className="hidden sm:inline">Volgende dag</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#174A7E] via-[#17628a] to-[#1693a4] p-6 text-white shadow-lg md:p-8">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-200/10" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-100">
            <span className="rounded-full bg-white/15 px-3 py-1">Reisdag {day.dayNumber}</span>
            <span>{formatDate(day.date)}</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{day.plaats}</h1>
          <p className="mt-2 flex items-center gap-2 text-cyan-50">
            <MapPin className="h-4 w-4" /> {day.land}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMetric
              label="Weer"
              icon={CloudSun}
              value="Open Weer voor actuele gegevens"
            />
            <HeroMetric
              label="Overnachting"
              icon={BedDouble}
              value={accommodation?.name || day.overnachting || "Nog niet ingevuld"}
            />
            <HeroMetric label="Route" icon={Route} value={routeLabel} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {shortcuts.map(({ label, icon: Icon, tab }) => (
          <button
            key={label}
            type="button"
            onClick={() => label === "Route openen" && day.routeUrl ? window.open(day.routeUrl, "_blank", "noopener,noreferrer") : setActiveTab(tab)}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <Icon className="mb-3 h-5 w-5 text-[#1693a4]" />
            <span className="text-sm font-bold">{label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <CalendarDays className="text-[#1693a4]" /> Planning
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className="text-xs font-bold text-[#174A7E] dark:text-cyan-300"
            >
              Hele tijdlijn
            </button>
          </div>

          <div className="space-y-3">
            {flight && (
              <TimelineRow
                icon={Plane}
                time={flight.departureTime}
                title={`${flight.fromCode} → ${flight.toCode}`}
                detail={`${flightLabel(flight.airline, flight.flightNumber)}${flight.arrivalTime ? ` · aankomst ${flight.arrivalTime}` : ""}${flight.bookingReference ? ` · reservering ${flight.bookingReference}` : ""}`}
              />
            )}
            {(plannedItems.length ? plannedItems : day.activiteiten.map((title) => ({ title, time: timeFromText(title) }))).map((item, index) => {
              const match = activityMatches[index];
              return (
                <TimelineRow
                  key={`${item.id || item.title}-${index}`}
                  icon={index === 0 ? MapPin : Ticket}
                  time={item.time || item.startTime || "—"}
                  title={item.title.replace(/^\s*\d{1,2}[.:]\d{2}\s*/, "")}
                  detail={item.detail || item.description || match?.description || match?.location || day.plaats}
                />
              );
            })}
            {!flight && plannedItems.length === 0 && day.activiteiten.length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800">
                Er staat nog niets gepland voor deze dag.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <InfoCard
            icon={BedDouble}
            title="Overnachting"
            primary={accommodation?.name || day.overnachting || "Nog niet ingevuld"}
            secondary={accommodation ? `${accommodation.address || accommodation.adres || accommodation.location || accommodation.stad || accommodation.city || "Adres nog niet ingevuld"} · check-in ${dateOnly(accommodation.checkIn)}` : day.plaats}
            onClick={() => setActiveTab("accommodaties")}
          />
          <InfoCard
            icon={Wallet}
            title="Vandaag uitgegeven"
            primary={formatMoney(daySpend)}
            secondary={`${expenses.length} uitgave${expenses.length === 1 ? "" : "n"} geregistreerd`}
            onClick={() => setActiveTab("budget")}
          />
          <InfoCard
            icon={Navigation}
            title="Volgende verplaatsing"
            primary={routeLabel}
            secondary={nextDay ? formatDate(nextDay.date) : "Laatste geplande reisdag"}
            onClick={() => setActiveTab("navigatie")}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={Camera}
          title="Foto's"
          value={`${photos.length || day.fotos.length}`}
          note="aan deze reisdag gekoppeld"
          onClick={() => setActiveTab("dagboek")}
        />
        <SummaryCard
          icon={BookOpen}
          title="Dagboek"
          value={journal ? "Geschreven" : "Nog leeg"}
          note={journal?.hoogtepunt || "Leg het mooiste moment vast"}
          onClick={() => setActiveTab("dagboek")}
        />
        <SummaryCard
          icon={CheckCircle2}
          title="Dagstatus"
          value={day.isCompleted ? "Afgerond" : "Gepland"}
          note={day.samenvatting || day.notities || "Werk deze reisdag bij"}
          onClick={() => setActiveTab("timeline")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black">
              <ShieldCheck className="h-5 w-5 text-[#1693a4]" /> Nog regelen
            </h2>
            <button type="button" onClick={() => setActiveTab("checklist")} className="text-xs font-bold text-[#174A7E] dark:text-cyan-300">
              Checklist
            </button>
          </div>
          {countryChecklist.length ? (
            <div className="space-y-2">
              {countryChecklist.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-md border-2 border-slate-300 dark:border-slate-600" />
                  <p className="text-sm font-semibold">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Alles voor deze bestemming is afgevinkt.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black">
              <FileText className="h-5 w-5 text-[#1693a4]" /> Handige documenten
            </h2>
            <button type="button" onClick={() => setActiveTab("documenten")} className="text-xs font-bold text-[#174A7E] dark:text-cyan-300">
              Alle documenten
            </button>
          </div>
          {relevantDocuments.length ? (
            <div className="space-y-2">
              {relevantDocuments.slice(0, 3).map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setActiveTab("documenten")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#174A7E] shadow-sm dark:bg-slate-900 dark:text-cyan-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{document.titel}</span>
                    <span className="block truncate text-xs text-slate-500">{document.categorie}</span>
                  </span>
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800">
              Er zijn nog geen relevante documenten toegevoegd.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

const HeroMetric = ({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
}) => (
  <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-cyan-100">{label}</span>
    <span className="mt-1 flex items-start gap-2 text-sm font-bold">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="line-clamp-2">{value}</span>
    </span>
  </div>
);

const TimelineRow = ({
  icon: Icon,
  time,
  title,
  detail,
}: {
  key?: React.Key;
  icon: React.ElementType;
  time: string;
  title: string;
  detail: string;
}) => (
  <div className="grid grid-cols-[3.5rem_2.5rem_1fr] items-start gap-2">
    <span className="pt-2 text-xs font-black text-slate-500">{time}</span>
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 text-[#1693a4] dark:bg-cyan-950">
      <Icon className="h-4 w-4" />
    </span>
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{detail}</p>
    </div>
  </div>
);

const InfoCard = ({
  icon: Icon,
  title,
  primary,
  secondary,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  primary: string;
  secondary: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
  >
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#174A7E] text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
        <p className="mt-1 truncate font-black">{primary}</p>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{secondary}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
    </div>
  </button>
);

const SummaryCard = ({
  icon: Icon,
  title,
  value,
  note,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  note: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
  >
    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
      <Icon className="h-4 w-4 text-[#1693a4]" /> {title}
    </div>
    <p className="mt-3 text-xl font-black">{value}</p>
    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{note}</p>
  </button>
);

const EmptyState = ({ title, text, onClick }: { title: string; text: string; onClick: () => void }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <CalendarDays className="mx-auto h-10 w-10 text-[#1693a4]" />
    <h1 className="mt-4 text-xl font-black">{title}</h1>
    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{text}</p>
    <button type="button" onClick={onClick} className="mt-5 rounded-xl bg-[#174A7E] px-4 py-2 text-sm font-bold text-white">
      Naar reisplanning
    </button>
  </div>
);
