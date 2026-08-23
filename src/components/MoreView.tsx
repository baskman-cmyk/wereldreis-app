import React from "react";
import {
  Ticket,
  FileText,
  BookOpen,
  PackageCheck,
  CheckSquare,
  CloudSun,
  Coins,
  HeartPulse,
  ShieldAlert,
  BarChart3,
  Download,
  FileSpreadsheet,
  ChevronRight,
  Settings2,
  Route,
  Wallet,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { TabType, TripDataState } from "../types";

interface MoreViewProps {
  data: TripDataState;
  setActiveTab: (tab: TabType) => void;
  onOpenExport: () => void;
  onOpenExcelImport: () => void;
  canInstall: boolean;
  isInstalled: boolean;
  onInstall: () => void;
}

interface MoreItem {
  id?: TabType;
  label: string;
  description: string;
  icon: React.ElementType;
  value?: string | number;
  action?: () => void;
  tone?: "blue" | "cyan" | "amber" | "rose" | "emerald";
}

const toneClasses: Record<NonNullable<MoreItem["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export const MoreView: React.FC<MoreViewProps> = ({
  data,
  setActiveTab,
  onOpenExport,
  onOpenExcelImport,
  canInstall,
  isInstalled,
  onInstall,
}) => {
  const openTasks = data.checklists.filter((item) => !item.completed).length;
  const packed = data.packingItems.filter((item) => ["in koffer", "in camper", "ingepakt", "packed", "klaar"].includes(String(item.status).toLowerCase()) || item.completed).length;
  const totalPacking = data.packingItems.length;
  const journalDays = new Set(data.journals.map((item) => item.datum)).size;

  const sections: { title: string; subtitle: string; items: MoreItem[] }[] = [
    {
      title: "Planning & boekingen",
      subtitle: "Aanvullingen op Reis, Verblijf en Vervoer uit de hoofdnavigatie.",
      items: [
        { id: "activiteiten", label: "Activiteiten", description: "Tickets en reserveringen", icon: Ticket, value: data.activities.length, tone: "emerald" },
        { id: "navigatie", label: "Reiskaart", description: "Route, locaties en ontbrekende kaartpunten", icon: Route, value: data.savedLocations.length + data.accommodations.length, tone: "cyan" },
        { id: "budget", label: "Budget", description: "Benodigd, betaald en bekostiging", icon: Wallet, value: "EUR", tone: "blue" },
      ],
    },
    {
      title: "Herinneringen & documenten",
      subtitle: "Bewaar belangrijke bestanden en leg de reis vast.",
      items: [
        { id: "documenten", label: "Documenten", description: "Paspoorten, visa en verzekeringen", icon: FileText, value: data.documents.length, tone: "blue" },
        { id: "dagboek", label: "Dagboek & foto's", description: "Verhalen per reisdag", icon: BookOpen, value: `${journalDays} dagen`, tone: "amber" },
      ],
    },
    {
      title: "Voorbereiding & gezin",
      subtitle: "Houd taken, bagage en gezondheid onder controle.",
      items: [
        { id: "checklist", label: "Checklist", description: "Acties en deadlines", icon: CheckSquare, value: `${openTasks} open`, tone: openTasks > 0 ? "rose" : "emerald" },
        { id: "paklijst", label: "Paklijst", description: "Per persoon en per bagagefase", icon: PackageCheck, value: `${packed}/${totalPacking}`, tone: "emerald" },
        { id: "gezondheid", label: "Gezondheid", description: "Medicatie en gezinsinformatie", icon: HeartPulse, value: data.familyMembers.length, tone: "rose" },
      ],
    },
    {
      title: "Handig onderweg",
      subtitle: "Snelle hulpmiddelen voor iedere bestemming.",
      items: [
        { id: "weer", label: "Weer", description: "Verwachting per bestemming", icon: CloudSun, tone: "cyan" },
        { id: "valuta", label: "Valuta", description: "Snel bedragen omrekenen", icon: Coins, tone: "amber" },
        { id: "nood", label: "Noodinformatie", description: "Alarmnummers en contacten", icon: ShieldAlert, tone: "rose" },
        { id: "statistieken", label: "Statistieken", description: "Reis-, foto- en budgetcijfers", icon: BarChart3, tone: "blue" },
      ],
    },
    {
      title: "Importeren & beheer",
      subtitle: "Werk je reisgegevens bij en maak een veilige back-up.",
      items: [
        { label: "Excel-werkmap bijwerken", description: "Werk je reisplanning en reserveringen bij", icon: FileSpreadsheet, action: onOpenExcelImport, tone: "emerald" },
        { label: "Back-up & offline controle", description: "Back-up, opslag en offline beschikbaarheid", icon: Download, action: onOpenExport, tone: "blue" },
        {
          label: isInstalled ? "App geïnstalleerd" : "Installeer de app",
          description: isInstalled
            ? "De Wereldreis-app staat op dit apparaat"
            : canInstall
              ? "Open de app als zelfstandige app"
              : "Gebruik het browsermenu om de app te installeren",
          icon: isInstalled ? CheckCircle2 : Smartphone,
          action: canInstall ? onInstall : undefined,
          tone: isInstalled ? "emerald" : "blue",
        },
      ],
    },
  ];

  const openItem = (item: MoreItem) => {
    if (item.action) item.action();
    else if (item.id) setActiveTab(item.id);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#23689F] p-4 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">
              <Settings2 className="h-4 w-4" /> Alle reisfuncties
            </div>
            <h2 className="text-3xl font-black tracking-tight">Meer</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Alle aanvullende onderdelen overzichtelijk bij elkaar. Je belangrijkste dagelijkse pagina's blijven hierdoor rustig en snel bereikbaar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/10 px-3 py-3"><strong className="block text-xl">{openTasks}</strong><span className="text-[10px] text-blue-100">taken open</span></div>
            <div className="rounded-2xl bg-white/10 px-3 py-3"><strong className="block text-xl">{data.documents.length}</strong><span className="text-[10px] text-blue-100">documenten</span></div>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{section.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{section.subtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.icon;
              const tone = toneClasses[item.tone ?? "blue"];
              return (
                <button
                  key={item.label}
                  onClick={() => openItem(item)}
                  className="group flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#39B8C8] hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">{item.label}</span>
                      {item.value !== undefined && (
                        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.value}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#174A7E] dark:text-slate-600" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
