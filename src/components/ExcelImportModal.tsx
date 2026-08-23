import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { createRecoveryPoint, recordExcelImport } from "../utils/storage";
import type { ExcelImportPreview } from "../utils/excelImport";
import type { TripDataState } from "../types";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TripDataState;
  onDataLoaded: (data: TripDataState) => void;
}

type ImportStrategy = "merge" | "replace";

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const MAX_FILE_SIZE = 30 * 1024 * 1024;

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, data, onDataLoaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [strategy, setStrategy] = useState<ImportStrategy>("replace");

  useEffect(() => {
    if (isOpen) return;
    setPreview(null);
    setFileName("");
    setError("");
    setLoading(false);
    setApplying(false);
    setStrategy("replace");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setPreview(null);
    const extension = file.name.toLowerCase().split(".").at(-1);
    if (!extension || !["xlsx", "xlsm", "xls"].includes(extension)) {
      setError("Kies een Excel-werkmap met de extensie .xlsx, .xlsm of .xls.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Deze werkmap is groter dan 30 MB. Maak eerst een compactere kopie.");
      return;
    }

    setLoading(true);
    setFileName(file.name);
    try {
      const [xlsxModule, importer] = await Promise.all([import("xlsx"), import("../utils/excelImport")]);
      const workbook = xlsxModule.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const nextPreview = importer.createExcelImportPreview(workbook, file.name);
      if (!nextPreview.timeline.length) throw new Error("Geen reisdagen gevonden. Controleer of het tabblad ‘Planning simpel’ aanwezig is.");
      setPreview(nextPreview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De Excel-werkmap kon niet worden gelezen.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyImport = async () => {
    if (!preview) return;
    setApplying(true);
    setError("");
    try {
      const { applyExcelImport } = await import("../utils/excelImport");
      createRecoveryPoint(data);
      onDataLoaded(applyExcelImport(data, preview, strategy === "replace"));
      recordExcelImport(preview.fileName || fileName);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De Excel-import kon niet worden toegepast.");
      setApplying(false);
    }
  };

  const counts = preview ? [
    ["Reisdagen", preview.timeline.length],
    ["Landen", preview.countries.length],
    ["Detailplanningen", preview.detailSheets.length],
    ["Vluchten", preview.flights.length],
    ["Verblijven", preview.accommodations.length],
    ["Activiteiten", preview.activities.length],
    ["Komoot-routes", preview.timeline.reduce((sum, day) => sum + (day.komootRoutes?.length || 0), 0)],
    ["Huurauto’s", preview.carRentals.length],
    ["Paklijstregels", preview.packingItems.length],
    ["Noodlanden", preview.emergencies.length],
    ["Taken", preview.checklists.length],
    ["Budgetregels", preview.budgetExpenses.length],
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:max-h-[92dvh] sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><FileSpreadsheet className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Veilige import</p>
              <h2 className="break-anywhere text-lg font-black text-slate-900 dark:text-white sm:text-2xl">Excel-werkmap controleren</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Excel-import sluiten" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />

          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300"><Upload className="h-5 w-5" /></span>
              <div><strong className="block break-anywhere text-sm text-slate-900 dark:text-white">{fileName || "Kies de actuele reiswerkmap"}</strong><span className="text-xs text-slate-500 dark:text-slate-400">.xlsx, .xlsm of .xls · maximaal 30 MB</span></div>
            </div>
            <button type="button" disabled={loading} onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}{preview ? "Andere werkmap" : "Werkmap kiezen"}
            </button>
          </div>

          {error && <div role="alert" className="mt-3 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</div>}

          {!preview && !loading && (
            <div className="mt-5 rounded-3xl bg-slate-50 px-5 py-12 text-center dark:bg-slate-950/40">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">Eerst controleren, dan importeren</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">De app leest planning, dagroutes, Komoot-wandelingen, vluchten, verblijven, activiteiten, huurauto’s, paklijst, noodnummers, taken en budget. Er verandert niets voordat je onderaan bevestigt.</p>
            </div>
          )}

          {preview && (
            <div className="mt-5 space-y-5">
              <section>
                <div className="mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><h3 className="font-black text-slate-900 dark:text-white">Gevonden gegevens</h3></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {counts.map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><strong className="block text-xl text-slate-900 dark:text-white">{count}</strong><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span></div>)}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-black text-slate-900 dark:text-white">Budgetcontrole</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Thuis", preview.budgetDashboard.homeCostsEur],
                    ["Voor vertrek", preview.budgetDashboard.upfrontCostsEur],
                    ["Onderweg", preview.budgetDashboard.travelCostsEur],
                    ["Totaal nodig", preview.budgetDashboard.totalNeededEur],
                  ].map(([label, amount]) => <div key={String(label)}><span className="block text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span><strong className="mt-1 block break-anywhere text-base text-slate-900 dark:text-white sm:text-lg">{euro.format(Number(amount || 0))}</strong></div>)}
                </div>
              </section>

              {preview.warnings.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex gap-2 text-sm font-black text-amber-800 dark:text-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" />{preview.warnings.length} aandachtspunt{preview.warnings.length === 1 ? "" : "en"}</div>
                  <ul className="mt-2 space-y-1 pl-7 text-sm text-amber-800 dark:text-amber-200">{preview.warnings.map((warning) => <li key={warning} className="list-disc">{warning}</li>)}</ul>
                </section>
              )}

              <section>
                <h3 className="mb-3 font-black text-slate-900 dark:text-white">Hoe wil je importeren?</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setStrategy("replace")} className={`min-h-24 rounded-2xl border p-4 text-left transition ${strategy === "replace" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700"}`}>
                    <span className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><RefreshCw className="h-4 w-4" />Excel als actuele bron</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Vervangt de bestaande reisgegevens per onderdeel. Beste keuze bij een complete werkmap.</span>
                  </button>
                  <button type="button" onClick={() => setStrategy("merge")} className={`min-h-24 rounded-2xl border p-4 text-left transition ${strategy === "merge" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-700"}`}>
                    <span className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><ArrowRight className="h-4 w-4" />Samenvoegen</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Voegt de regels toe aan wat al in de app staat. Handig voor een gedeeltelijke aanvulling.</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>

        <footer className="border-t border-slate-200 bg-slate-50 p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950/40 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 sm:mb-0"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />Voor de import wordt automatisch een herstelpunt gemaakt.</div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl px-5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto">Annuleren</button>
            <button type="button" disabled={!preview || applying} onClick={() => void applyImport()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              {applying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{strategy === "replace" ? "Werkmap als bron gebruiken" : "Werkmap samenvoegen"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ExcelImportModal;
