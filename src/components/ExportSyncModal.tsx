import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  BookOpen,
  X,
  RefreshCw,
  Check,
  HardDrive,
  RotateCcw,
  WifiOff,
  Database,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { TripDataState } from "../types";
import {
  exportBudgetToCSV,
  exportTravelBookHTML,
  exportToJSON,
  resetTripData,
  saveTripData,
  createRecoveryPoint,
  restoreRecoveryPoint,
  getStorageStatus,
  getAttachmentStorageSummary,
  checkOfflineReadiness,
  pruneOrphanedAttachments,
  exportFilesBackup,
  importFilesBackup,
  exportFullBackup,
  importFullBackup,
  type OfflineReadinessStatus,
  type AttachmentStorageSummary,
} from "../utils/storage";

interface ExportSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TripDataState;
  onDataLoaded: (newData: TripDataState) => void;
}

export const ExportSyncModal: React.FC<ExportSyncModalProps> = ({
  isOpen,
  onClose,
  data,
  onDataLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesBackupInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>("");
  const [statusVersion, setStatusVersion] = useState(0);
  const [offlineStatus, setOfflineStatus] = useState<OfflineReadinessStatus | null>(null);
  const [checkingOffline, setCheckingOffline] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentStorageSummary>({ count: 0, sizeBytes: 0 });
  const [exportingFiles, setExportingFiles] = useState(false);
  const [importingFiles, setImportingFiles] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [exportingFull, setExportingFull] = useState(false);
  const [resetting, setResetting] = useState(false);
  const storageStatus = useMemo(() => getStorageStatus(), [isOpen, data, statusVersion]);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 MB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const refreshAttachments = async () => {
    try {
      setAttachments(await getAttachmentStorageSummary(data));
    } catch {
      // Bijlagenoverzicht is niet essentieel; negeer stil als IndexedDB niet beschikbaar is.
    }
  };

  useEffect(() => {
    void refreshAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, statusVersion]);

  const runOfflineCheck = async () => {
    setCheckingOffline(true);
    try {
      setOfflineStatus(await checkOfflineReadiness());
    } catch {
      setMessage("De offlinecontrole kon in deze browser niet volledig worden uitgevoerd.");
    } finally {
      setCheckingOffline(false);
    }
  };

  useEffect(() => {
    if (isOpen) void runOfflineCheck();
  }, [isOpen]);

  if (!isOpen) return null;


  const handleFullBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        createRecoveryPoint(data);
        const { data: imported, filesRestored, filesMissingWarning } = await importFullBackup(parsed);
        saveTripData(imported);
        onDataLoaded(imported);
        setStatusVersion((value) => value + 1);
        await refreshAttachments();
        if (filesMissingWarning) {
          setMessage(
            "Reisdata geïmporteerd, maar dit was een back-up zonder bestanden. Als de bijlagen (PDF's/foto's) ontbreken, importeer dan ook de bijbehorende bestanden-back-up hieronder. De vorige gegevens zijn als herstelpunt bewaard.",
          );
        } else {
          setMessage(
            filesRestored > 0
              ? `Volledige back-up geïmporteerd: reisdata en ${filesRestored} bestand${filesRestored === 1 ? "" : "en"} zijn teruggezet. De vorige gegevens zijn als herstelpunt bewaard.`
              : "Back-up geïmporteerd. De vorige gegevens zijn als herstelpunt bewaard.",
          );
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Het back-upbestand kon niet worden gelezen.");
      }
    };
    reader.onerror = () => setMessage("Het geselecteerde bestand kon niet worden geopend.");
    reader.readAsText(file);
  };

  const handleExportFullBackup = async () => {
    setExportingFull(true);
    try {
      const { fileCount } = await exportFullBackup(data);
      setStatusVersion((value) => value + 1);
      setMessage(`Volledige back-up gedownload: reisdata + ${fileCount} bestand${fileCount === 1 ? "" : "en"} in één bestand.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "De volledige back-up kon niet worden gemaakt.");
    } finally {
      setExportingFull(false);
    }
  };

  const handleExportFilesBackup = async () => {
    setExportingFiles(true);
    try {
      const count = await exportFilesBackup();
      setMessage(count > 0 ? `Bestanden-back-up gedownload (${count} bestand${count === 1 ? "" : "en"}).` : "Er zijn nog geen lokale bestanden om te back-uppen.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "De bestanden-back-up kon niet worden gemaakt.");
    } finally {
      setExportingFiles(false);
    }
  };

  const handleFilesBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingFiles(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const restored = await importFilesBackup(JSON.parse(evt.target?.result as string));
        await refreshAttachments();
        setMessage(`${restored} bestand${restored === 1 ? "" : "en"} teruggezet in de lokale bestandsopslag.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Het bestand kon niet worden teruggezet.");
      } finally {
        setImportingFiles(false);
        if (filesBackupInputRef.current) filesBackupInputRef.current.value = "";
      }
    };
    reader.onerror = () => { setImportingFiles(false); setMessage("Het geselecteerde bestand kon niet worden geopend."); };
    reader.readAsText(file);
  };

  const handlePruneOrphaned = async () => {
    setPruning(true);
    try {
      const { removedCount, freedBytes } = await pruneOrphanedAttachments(data);
      await refreshAttachments();
      setMessage(
        removedCount > 0
          ? `Opslag opgeschoond: ${removedCount} niet meer gebruikt bestand${removedCount === 1 ? "" : "en"} verwijderd (${formatBytes(freedBytes)} vrijgemaakt).`
          : "Geen niet meer gebruikte bestanden gevonden. De opslag is al schoon.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Opschonen is mislukt.");
    } finally {
      setPruning(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Weet je zeker dat je alle gegevens wilt herstellen naar de standaard wereldreis instellingen? Dit verwijdert ook alle lokaal opgeslagen PDF's en foto's definitief (de huidige gegevens worden wel eerst als herstelpunt bewaard, maar dat herstelpunt bevat geen bestanden meer na deze reset).")) return;
    setResetting(true);
    try {
      const reset = await resetTripData();
      onDataLoaded(reset);
      setStatusVersion((value) => value + 1);
      await refreshAttachments();
      setMessage("Standaardgegevens hersteld en lokale bestandsopslag geleegd. Je vorige reisdata zijn als herstelpunt bewaard (zonder bestanden).");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset is mislukt.");
    } finally {
      setResetting(false);
    }
  };

  const handleRestoreRecoveryPoint = () => {
    if (!confirm("Het laatste herstelpunt terugzetten? De huidige gegevens worden eerst opnieuw als herstelpunt bewaard.")) return;
    const restored = restoreRecoveryPoint(data);
    if (restored) {
      onDataLoaded(restored);
      setMessage("Het herstelpunt is teruggezet.");
    } else {
      setMessage("Er is geen bruikbaar herstelpunt gevonden.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-[#174A7E] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-[#39B8C8]" />
            <h3 className="font-bold text-base">Back-up & offline controle</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 overflow-y-auto p-5">
          {/* Offline Sync Status */}
          <div className="p-3.5 bg-[#F3E7C8]/40 dark:bg-slate-800/80 rounded-xl border border-[#F3E7C8] dark:border-slate-700 flex items-center gap-3">
            <HardDrive className="w-6 h-6 text-[#174A7E] dark:text-[#39B8C8] shrink-0" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                Reisgegevens lokaal opgeslagen <Check className="w-4 h-4 text-emerald-600" />
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Lokaal opgeslagen op dit apparaat. Laatst bewaard: {storageStatus.savedAt ? new Date(storageStatus.savedAt).toLocaleString("nl-NL") : "nog niet bekend"}.
              </p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                Reisdata: {formatBytes(storageStatus.sizeBytes)} · {attachments.count} bijlage{attachments.count === 1 ? "" : "n"} ({formatBytes(attachments.sizeBytes)}).
              </p>
              <button
                type="button"
                onClick={() => void handlePruneOrphaned()}
                disabled={pruning}
                className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm disabled:opacity-60 dark:bg-slate-900 dark:text-slate-200"
              >
                {pruning ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Opslag opschonen
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-start gap-3"><WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-[#174A7E] dark:text-[#39B8C8]" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-black text-slate-900 dark:text-white">Offline gebruik controleren</h4><button type="button" onClick={() => void runOfflineCheck()} disabled={checkingOffline} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200">{checkingOffline ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Opnieuw testen</button></div>
              {offlineStatus ? <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <StatusLine ok={offlineStatus.serviceWorkerReady} label="Offline app actief" />
                <StatusLine ok={offlineStatus.appShellCached} label={`Appbestanden opgeslagen (${offlineStatus.cachedFiles})`} />
                <StatusLine ok={storageStatus.sizeBytes > 0} label="Reisgegevens opgeslagen" />
                <StatusLine ok={attachments.count > 0} neutral={attachments.count === 0} label={`${attachments.count} lokale bijlagen`} />
              </div> : <p className="mt-2 text-xs text-slate-500">Offlinecontrole wordt uitgevoerd…</p>}
              {offlineStatus?.usageBytes !== undefined && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400"><Database className="mr-1 inline h-3.5 w-3.5" />Browseropslag gebruikt: {formatBytes(offlineStatus.usageBytes)}{offlineStatus.quotaBytes ? ` van ${formatBytes(offlineStatus.quotaBytes)}` : ""}. {offlineStatus.persistentStorage === false ? "Bewaar daarnaast geregeld een back-up buiten de browser." : ""}</p>}
            </div></div>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><span className="font-black text-slate-700 dark:text-slate-200">Laatste Excel-import</span><span className="mt-1 block break-words text-slate-500">{storageStatus.lastExcelImport ? `${new Date(storageStatus.lastExcelImport.importedAt).toLocaleString("nl-NL")} · ${storageStatus.lastExcelImport.fileName}` : "Nog niet geregistreerd"}</span></div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><span className="font-black text-slate-700 dark:text-slate-200">Laatste gedownloade back-up</span><span className="mt-1 block text-slate-500">{storageStatus.lastBackupExport ? new Date(storageStatus.lastBackupExport).toLocaleString("nl-NL") : "Nog geen back-up gedownload"}</span></div>
          </div>

          {/* Export Actions */}
          <div>
            <button
              onClick={() => void handleExportFullBackup()}
              disabled={exportingFull}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-[#174A7E] bg-[#174A7E] p-3.5 text-left text-white transition hover:bg-[#123a63] disabled:opacity-60 dark:border-[#39B8C8]"
            >
              {exportingFull ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-[#39B8C8]" /> : <HardDrive className="h-5 w-5 shrink-0 text-[#39B8C8]" />}
              <div>
                <span className="block text-sm font-black">Volledige back-up downloaden (aanbevolen)</span>
                <span className="text-[11px] opacity-80">Reisdata + alle PDF's en foto's samen in één bestand — het veiligst om te bewaren of over te zetten naar een ander apparaat.</span>
              </div>
            </button>

            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Geavanceerd: reisdata en bestanden apart exporteren</summary>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  onClick={() => { exportToJSON(data); setStatusVersion((value) => value + 1); setMessage("Alleen reisdata gedownload (zonder bijlagen)."); }}
                  className="flex items-center gap-2.5 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs transition border border-slate-200 dark:border-slate-700"
                >
                  <FileCode className="w-4 h-4 text-[#39B8C8]" />
                  <div className="text-left">
                    <span className="block font-bold">Alleen reisdata</span>
                    <span className="text-[10px] opacity-75">Overzicht, planning en wijzigingen (JSON), zonder bijlagen</span>
                  </div>
                </button>

                <button
                  onClick={() => void handleExportFilesBackup()}
                  disabled={exportingFiles}
                  className="flex items-center gap-2.5 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs transition border border-slate-200 dark:border-slate-700 disabled:opacity-60"
                >
                  {exportingFiles ? <LoaderCircle className="w-4 h-4 animate-spin text-[#39B8C8]" /> : <HardDrive className="w-4 h-4 text-[#39B8C8]" />}
                  <div className="text-left">
                    <span className="block font-bold">Alleen bestanden</span>
                    <span className="text-[10px] opacity-75">PDF's en foto's, zonder reisdata</span>
                  </div>
                </button>
              </div>
            </details>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                onClick={() => exportBudgetToCSV(data.budgetExpenses)}
                className="flex items-center gap-2.5 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7E] hover:text-white dark:hover:bg-[#174A7E] text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs transition border border-slate-200 dark:border-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <div className="text-left">
                  <span className="block font-bold">CSV Uitgaven</span>
                  <span className="text-[10px] opacity-75">Voor Excel / Google Sheets</span>
                </div>
              </button>

              <button
                onClick={() => exportTravelBookHTML(data)}
                className="flex items-center gap-2.5 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7E] hover:text-white dark:hover:bg-[#174A7E] text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs transition border border-slate-200 dark:border-slate-700"
              >
                <BookOpen className="w-4 h-4 text-amber-500" />
                <div className="text-left">
                  <span className="block font-bold">HTML & PDF Reisboek</span>
                  <span className="text-[10px] opacity-75">Printsfeervolle opmaak van dagboek, route & vluchten</span>
                </div>
              </button>
            </div>
          </div>

          {message && (
            <div role="status" className="rounded-xl border border-[#39B8C8]/30 bg-[#39B8C8]/10 px-3 py-2 text-xs font-semibold text-[#174A7E] dark:text-cyan-100">
              {message}
            </div>
          )}

          {/* Import & Reset */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFullBackupUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 px-3 py-2.5 bg-[#174A7E] hover:bg-[#123a63] text-white text-xs font-bold rounded-xl transition"
            >
              <Upload className="w-3.5 h-3.5 text-[#39B8C8]" />
              <span>Back-up terugzetten (reisdata + bestanden)</span>
            </button>

            <details className="group">
              <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Geavanceerd: alleen bestanden terugzetten</summary>
              <div className="mt-2.5">
                <input
                  type="file"
                  ref={filesBackupInputRef}
                  onChange={handleFilesBackupUpload}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => filesBackupInputRef.current?.click()}
                  disabled={importingFiles}
                  className="flex w-full items-center justify-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {importingFiles ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#174A7E] dark:text-[#39B8C8]" />}
                  <span>Alleen bestanden terugzetten</span>
                </button>
                <p className="mt-1.5 text-[10px] text-slate-500">Gebruik dit alleen om ontbrekende bijlagen aan te vullen naast een reisdata-back-up die je al hebt teruggezet.</p>
              </div>
            </details>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleRestoreRecoveryPoint}
                disabled={!storageStatus.hasRecoveryPoint}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Herstelpunt</span>
              </button>

              <button
                onClick={() => void handleReset()}
                disabled={resetting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl transition disabled:opacity-60"
              >
                {resetting ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Fabrieksinstellingen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusLine = ({ ok, neutral = false, label }: { ok: boolean; neutral?: boolean; label: string }) => (
  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 font-bold ${neutral ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
    {ok ? <Check className="h-4 w-4 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}{label}
  </div>
);
