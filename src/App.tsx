import React, { useState, useEffect, useRef } from "react";
import { PackingItem, PackingPerson, TabType, TripDataState } from "./types";
import { loadTripData, saveTripData, migrateAndSaveLegacyAttachments, pruneOrphanedAttachments } from "./utils/storage";
import { requestPersistentStorage, deleteFile } from "./utils/fileStore";

// Components
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { ExportSyncModal } from "./components/ExportSyncModal";
import { ExcelImportModal } from "./components/ExcelImportModal";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

// Views
import { TodayView } from "./components/TodayView";
import { TimelineView } from "./components/TimelineView";
import { ReisplanningView } from "./components/ReisplanningView";
import { VluchtenView } from "./components/VluchtenView";
import { AccommodatiesView } from "./components/AccommodatiesView";
import { CamperView } from "./components/CamperView";
import { VervoerView } from "./components/VervoerView";
import { BudgetView } from "./components/BudgetView";
import { DocumentenView } from "./components/DocumentenView";
import { GezondheidView } from "./components/GezondheidView";
import { PaklijstView } from "./components/PaklijstView";
import { DagboekView } from "./components/DagboekView";
import { ActiviteitenView } from "./components/ActiviteitenView";
import { ChecklistView } from "./components/ChecklistView";
import { WeerView } from "./components/WeerView";
import { ValutaView } from "./components/ValutaView";
import { NoodView } from "./components/NoodView";
import { StatistiekenView } from "./components/StatistiekenView";
import { MoreView } from "./components/MoreView";

const KaartenView = React.lazy(() => import("./components/KaartenView").then((module) => ({ default: module.KaartenView })));

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function App() {
  const [data, setData] = useState<TripDataState>(() => loadTripData());
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("wereldreis-theme") === "dark");
  const mainRef = useRef<HTMLElement>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Modals & Import states
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [storageErrorMessage, setStorageErrorMessage] = useState<string | null>(null);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

  // Auto-save data changes to localStorage
  useEffect(() => {
    saveTripData(data);
  }, [data]);

  // Achtergrond-opschoning: een paar seconden na elke wijziging in de reisdata controleren we
  // of er bestanden in IndexedDB staan waar niets meer naar verwijst. Dit vangt ook cascade-
  // verwijderingen op (een heel document, gezinslid of reisdag verwijderen neemt de bijbehorende
  // bijlagen mee) die niet via één specifieke "verwijder bijlage"-knop lopen. Gedebounced zodat
  // dit niet bij elke toetsaanslag draait.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      pruneOrphanedAttachments(data)
        .then(({ removedCount }) => {
          if (removedCount > 0) console.info(`Opslag opgeschoond: ${removedCount} niet meer gebruikte bestand(en) verwijderd.`);
        })
        .catch((error) => console.error("Achtergrond-opschoning van bestanden is mislukt:", error));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [data]);

  // Meld opslagfouten (bijv. localStorage vol) daadwerkelijk aan de gebruiker in plaats van ze alleen te loggen.
  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setStorageErrorMessage(
        detail
          ? `Reisgegevens konden niet lokaal worden opgeslagen: ${detail}. Maak een back-up en probeer het opnieuw.`
          : "Reisgegevens konden niet lokaal worden opgeslagen. Maak een back-up en probeer het opnieuw.",
      );
    };
    window.addEventListener("wereldreis-storage-error", handleStorageError);
    return () => window.removeEventListener("wereldreis-storage-error", handleStorageError);
  }, []);

  // Eenmalige migratie: bestanden die vóór v2.19.0 nog inline als dataURL waren opgeslagen
  // (PDF's, dagboekfoto's, vaccinatieboekje-foto's) verplaatsen naar IndexedDB. Daarna
  // controleren we meteen op weesbestanden (verwijderde/vervangen bijlagen die nog wel
  // als blob in IndexedDB stonden) zodat verwijderde bestanden geen ruimte blijven innemen.
  useEffect(() => {
    let cancelled = false;
    void requestPersistentStorage();
    (async () => {
      try {
        const { data: migrated, migratedCount } = await migrateAndSaveLegacyAttachments(data);
        if (cancelled) return;
        if (migratedCount > 0) {
          setData(migrated);
          setMigrationMessage(`${migratedCount} bestand${migratedCount === 1 ? "" : "en"} (PDF's/foto's) ${migratedCount === 1 ? "is" : "zijn"} overgezet naar de lokale bestandsopslag voor betrouwbaardere offline opslag.`);
        }
        const { removedCount } = await pruneOrphanedAttachments(migrated);
        if (removedCount > 0) console.info(`Opslag opgeschoond: ${removedCount} niet meer gebruikte bestand(en) verwijderd.`);
      } catch (error) {
        console.error("Migratie/opschonen van bestanden is mislukt:", error);
      }
    })();
    return () => { cancelled = true; };
    // Alleen bij het opstarten van de app uitvoeren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("wereldreis-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Global keyboard shortcuts and escape handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (!isTyping && event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setExportOpen(false);
        setExcelImportOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Move keyboard focus to the newly selected page.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // PWA installation and update events.
  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    const handleUpdate = (event: Event) => {
      setUpdateRegistration((event as CustomEvent<ServiceWorkerRegistration>).detail);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("wereldreis-sw-update", handleUpdate);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("wereldreis-sw-update", handleUpdate);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  const handleApplyUpdate = () => {
    updateRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  // Handlers for state updates
  const handleUpdateTimelineDay = (updatedDay: any) => {
    setData((prev) => ({
      ...prev,
      timeline: prev.timeline.map((d) => (d.id === updatedDay.id ? { ...updatedDay, localModifiedAt: new Date().toISOString() } : d)),
    }));
  };

  const handleAddTimelineDay = (newDay: any) => {
    setData((prev) => ({
      ...prev,
      timeline: [...prev.timeline, { ...newDay, source: "manual", localModifiedAt: new Date().toISOString() }],
    }));
  };
  const handleDeleteTimelineDay = (id: string) => setData((prev) => ({ ...prev, timeline: prev.timeline.filter((day) => day.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));

  const handleAddLocation = (loc: any) => {
    setData((prev) => ({
      ...prev,
      savedLocations: [{ ...loc, source: "manual", localModifiedAt: new Date().toISOString() }, ...prev.savedLocations],
    }));
  };
  const handleDeleteLocation = (id: string) => setData((prev) => ({ ...prev, savedLocations: prev.savedLocations.filter((location) => location.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));
  const handleUpdateLocation = (location: any) => setData((prev) => ({ ...prev, savedLocations: prev.savedLocations.map((item) => item.id === location.id ? { ...item, ...location, localModifiedAt: new Date().toISOString() } : item) }));

  const handleSaveMapCoordinates = (category: "accommodations" | "activities" | "saved", id: string, gps: any) => {
    setData((prev) => category === "accommodations" ? { ...prev, accommodations: prev.accommodations.map((item) => item.id === id ? { ...item, gps } : item) } : category === "activities" ? { ...prev, activities: prev.activities.map((item) => item.id === id ? { ...item, gps } : item) } : { ...prev, savedLocations: prev.savedLocations.map((item) => item.id === id ? { ...item, gps } : item) });
  };

  const handleUpdateCamper = (camper: any) => {
    setData((prev) => ({ ...prev, camper: { ...camper, localModifiedAt: new Date().toISOString() } }));
  };

  const handleUpdateEmergencyProfile = (emergencyProfile: any) => {
    setData((prev) => ({ ...prev, emergencyProfile }));
  };

  const handleUpdateEmergencyContacts = (emergencies: NonNullable<TripDataState["emergencies"]>) => {
    setData((prev) => ({ ...prev, emergencies: emergencies.map((item) => ({ ...item, localModifiedAt: new Date().toISOString() })) }));
  };

  const handleAddExpense = (exp: any) => {
    setData((prev) => {
      const updatedExpenses = [exp, ...prev.budgetExpenses];
      const updatedBudgets = prev.categoryBudgets.map((cat) =>
        cat.category === exp.category
          ? { ...cat, spentEur: cat.spentEur + exp.amountEur }
          : cat
      );
      return {
        ...prev,
        budgetExpenses: updatedExpenses.map((item, index) => index === 0 ? { ...item, source: "manual", localModifiedAt: new Date().toISOString() } : item),
        categoryBudgets: updatedBudgets,
      };
    });
  };
  const handleDeleteExpense = (id: string) => setData((prev) => {
    const removed = prev.budgetExpenses.find((item) => item.id === id);
    return { ...prev, budgetExpenses: prev.budgetExpenses.filter((item) => item.id !== id), categoryBudgets: prev.categoryBudgets.map((category) => removed && category.category === removed.category ? { ...category, spentEur: Math.max(0, category.spentEur - removed.amountEur) } : category), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] };
  });
  const handleUpdateExpense = (expense: any) => setData((prev) => {
    const original = prev.budgetExpenses.find((item) => item.id === expense.id);
    return { ...prev, budgetExpenses: prev.budgetExpenses.map((item) => item.id === expense.id ? { ...expense, localModifiedAt: new Date().toISOString() } : item), categoryBudgets: prev.categoryBudgets.map((category) => {
      const subtract = original && category.category === original.category ? original.amountEur : 0;
      const add = category.category === expense.category ? expense.amountEur : 0;
      return subtract || add ? { ...category, spentEur: Math.max(0, category.spentEur - subtract + add) } : category;
    }) };
  });

  const handleAddDocument = (doc: any) => {
    setData((prev) => ({
      ...prev,
      documents: [{ ...doc, source: "manual", localModifiedAt: new Date().toISOString() }, ...prev.documents],
    }));
  };

  const handleUpdateDocument = (doc: any) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((item) => (item.id === doc.id ? { ...doc, localModifiedAt: new Date().toISOString() } : item)),
    }));
  };
  const handleDeleteDocument = (id: string) => setData((prev) => ({ ...prev, documents: prev.documents.filter((item) => item.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));

  const handleUpdateAccommodation = (accommodation: any) => {
    setData((prev) => ({
      ...prev,
      accommodations: prev.accommodations.map((item) =>
        item.id === accommodation.id ? { ...accommodation, localModifiedAt: new Date().toISOString() } : item
      ),
    }));
  };

  const handleAddAccommodation = (accommodation: any) => setData((prev) => ({ ...prev, accommodations: [{ ...accommodation, source: "manual", localModifiedAt: new Date().toISOString() }, ...prev.accommodations] }));
  const handleDeleteAccommodation = (id: string) => setData((prev) => ({ ...prev, accommodations: prev.accommodations.filter((item) => item.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));

  const handleUpdateFlight = (flight: any) => {
    setData((prev) => ({
      ...prev,
      flights: prev.flights.map((item) => (item.id === flight.id ? { ...flight, localModifiedAt: new Date().toISOString() } : item)),
    }));
  };

  const handleAddFlight = (flight: any) => setData((prev) => ({ ...prev, flights: [...prev.flights, { ...flight, source: "manual", localModifiedAt: new Date().toISOString() }] }));
  const handleDeleteFlight = (id: string) => setData((prev) => ({ ...prev, flights: prev.flights.filter((item) => item.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));

  const handleUpdateActivity = (activity: any) => {
    setData((prev) => ({
      ...prev,
      activities: prev.activities.map((item) =>
        item.id === activity.id ? { ...activity, localModifiedAt: new Date().toISOString() } : item
      ),
    }));
  };

  const handleAddActivity = (activity: any) => {
    setData((prev) => ({ ...prev, activities: [{ ...activity, source: "manual", localModifiedAt: new Date().toISOString() }, ...prev.activities] }));
  };

  const handleDeleteActivity = (id: string) => {
    setData((prev) => ({ ...prev, activities: prev.activities.filter((item) => item.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));
  };

  const handleUpdateFamilyMember = (member: any) => {
    setData((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.map((m) =>
        m.id === member.id ? { ...member, localModifiedAt: new Date().toISOString() } : m
      ),
    }));
  };

  const handleAddFamilyMember = (member: any) => {
    setData((prev) => ({ ...prev, familyMembers: [...prev.familyMembers, { ...member, source: "manual", localModifiedAt: new Date().toISOString() }] }));
  };
  const handleDeleteFamilyMember = (id: string) => setData((prev) => ({ ...prev, familyMembers: prev.familyMembers.filter((member) => member.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));

  const handleUpdateCurrencies = (currencies: Record<string, number>) => {
    setData((prev) => ({ ...prev, overview: { ...prev.overview, currencies } }));
  };

  const handleUpdatePackingItemStatus = (id: string, status: PackingItem["status"]) => {
    setData((prev) => ({
      ...prev,
      packingItems: prev.packingItems.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    }));
  };

  const handleAddPackingItem = (item: any) => {
    setData((prev) => ({
      ...prev,
      packingItems: [{ ...item, source: "manual", localModifiedAt: new Date().toISOString() }, ...prev.packingItems],
    }));
  };

  const handleAddPackingPerson = (person: PackingPerson) => {
    setData((prev) => ({ ...prev, packingPeople: [...(prev.packingPeople || []), person] }));
  };
  const handleDeletePackingPerson = (id: string) => setData((prev) => ({ ...prev, packingPeople: (prev.packingPeople || []).filter((person) => person.id !== id), packingItems: prev.packingItems.filter((item) => item.personId !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id, ...prev.packingItems.filter((item) => item.personId === id).map((item) => item.id)])] }));
  const handleUpdatePackingPerson = (person: PackingPerson) => setData((prev) => ({ ...prev, packingPeople: (prev.packingPeople || []).map((item) => item.id === person.id ? person : item), packingItems: prev.packingItems.map((item) => item.personId === person.id ? { ...item, person: person.name, toegewezenAan: person.name } : item) }));

  const handleUpdatePackingItem = (updatedItem: PackingItem) => {
    setData((prev) => ({
      ...prev,
      packingItems: prev.packingItems.map((item) => item.id === updatedItem.id ? { ...updatedItem, localModifiedAt: new Date().toISOString() } : item),
    }));
  };

  const handleDeletePackingItem = (id: string) => {
    setData((prev) => ({ ...prev, packingItems: prev.packingItems.filter((item) => item.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));
  };

  const handleAddPhoto = (photo: any) => {
    setData((prev) => ({
      ...prev,
      photos: [photo, ...prev.photos],
    }));
  };

  const handleAddJournal = (entry: any) => {
    setData((prev) => ({
      ...prev,
      journals: prev.journals.some((item) => item.id === entry.id || item.datum === entry.datum)
        ? prev.journals.map((item) => item.id === entry.id || item.datum === entry.datum ? entry : item)
        : [entry, ...prev.journals],
    }));
  };
  const handleDeleteJournal = (id: string) => setData((prev) => ({ ...prev, journals: prev.journals.filter((entry) => entry.id !== id) }));
  const handleDeletePhoto = (id: string) => setData((prev) => {
    const removed = prev.photos.find((photo) => photo.id === id);
    if (removed?.fileId) void deleteFile(removed.fileId).catch((cause) => console.error("Foto kon niet worden verwijderd uit de lokale opslag:", cause));
    return { ...prev, photos: prev.photos.filter((photo) => photo.id !== id) };
  });

  const handleToggleCheckItem = (_groupId: string, itemId: string) => {
    setData((prev) => ({
      ...prev,
      checklists: prev.checklists.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    }));
  };
  const handleAddCheckItem = (item: any) => setData((prev) => ({ ...prev, checklists: [{ ...item, source: "manual", localModifiedAt: new Date().toISOString() }, ...prev.checklists] }));
  const handleUpdateCheckItem = (item: any) => setData((prev) => ({ ...prev, checklists: prev.checklists.map((entry) => entry.id === item.id ? { ...item, localModifiedAt: new Date().toISOString() } : entry) }));
  const handleDeleteCheckItem = (id: string) => setData((prev) => ({ ...prev, checklists: prev.checklists.filter((item) => item.id !== id), deletedItemIds: [...new Set([...(prev.deletedItemIds || []), id])] }));

  return (
    <AppErrorBoundary>
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <a href="#main-content" className="skip-link">Ga naar hoofdinhoud</a>

      {/* Top Navbar */}
      <Navbar
        overview={data.overview}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={darkMode}
        setIsDarkMode={setDarkMode}
        isOnline={!isOffline}
        onOpenExport={() => setExportOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {isOffline && (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          Offline modus: je lokale reisgegevens blijven beschikbaar. Weer, kaarten en externe links kunnen tijdelijk niet werken.
        </div>
      )}

      {storageErrorMessage && (
        <div role="alert" className="flex items-center justify-center gap-3 border-b border-rose-300 bg-rose-50 px-4 py-2 text-center text-xs font-bold text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
          <span>{storageErrorMessage}</span>
          <button type="button" onClick={() => setStorageErrorMessage(null)} className="rounded-lg bg-rose-900/10 px-3 py-1.5 hover:bg-rose-900/20 dark:bg-white/10 dark:hover:bg-white/20">
            Sluiten
          </button>
        </div>
      )}

      {migrationMessage && (
        <div role="status" className="flex items-center justify-center gap-3 border-b border-emerald-300 bg-emerald-50 px-4 py-2 text-center text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <span>{migrationMessage}</span>
          <button type="button" onClick={() => setMigrationMessage(null)} className="rounded-lg bg-emerald-900/10 px-3 py-1.5 hover:bg-emerald-900/20 dark:bg-white/10 dark:hover:bg-white/20">
            Sluiten
          </button>
        </div>
      )}

      {updateRegistration && (
        <div role="status" className="flex items-center justify-center gap-3 border-b border-cyan-300 bg-cyan-50 px-4 py-2 text-center text-xs font-bold text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-100">
          <span>Er staat een nieuwe versie van de Wereldreis-app klaar.</span>
          <button type="button" onClick={handleApplyUpdate} className="rounded-lg bg-[#174A7E] px-3 py-1.5 text-white hover:bg-[#123d69]">
            Nu bijwerken
          </button>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-6 sm:py-6 lg:gap-6 lg:px-8">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Content View */}
        <main ref={mainRef} id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))] outline-none lg:pb-6">
          {activeTab === "today" && (
            <TodayView data={data} setActiveTab={setActiveTab} />
          )}

          {activeTab === "timeline" && (
            <TimelineView
              timeline={data.timeline}
              onAddDay={handleAddTimelineDay}
              onUpdateDay={handleUpdateTimelineDay}
              onDeleteDay={handleDeleteTimelineDay}
            />
          )}

          {activeTab === "reisplanning" && (
            <ReisplanningView
              countries={data.countries}
              timeline={data.timeline}
              accommodations={data.accommodations}
              activities={data.activities}
              flights={data.flights}
              savedLocations={data.savedLocations}
              setActiveTab={setActiveTab}
              onUpdateDay={handleUpdateTimelineDay}
            />
          )}

          {activeTab === "navigatie" && (
            <React.Suspense fallback={<ViewLoader label="Reiskaart laden…" />}>
              <KaartenView
                hikes={data.hikes}
                timeline={data.timeline}
                countryPlans={data.countries}
                savedLocations={data.savedLocations}
                accommodations={data.accommodations}
                activities={data.activities}
                onNavigate={setActiveTab}
                onAddLocation={handleAddLocation}
                onDeleteLocation={handleDeleteLocation}
                onUpdateLocation={handleUpdateLocation}
                onSaveCoordinates={handleSaveMapCoordinates}
              />
            </React.Suspense>
          )}

          {activeTab === "vervoer" && (
            <VervoerView
              flights={data.flights}
              camper={data.camper}
              onUpdateFlight={handleUpdateFlight}
              onAddFlight={handleAddFlight}
              onDeleteFlight={handleDeleteFlight}
              onUpdateCamper={handleUpdateCamper}
            />
          )}

          {activeTab === "vluchten" && (
            <VluchtenView flights={data.flights} onUpdateFlight={handleUpdateFlight} onAddFlight={handleAddFlight} onDeleteFlight={handleDeleteFlight} />
          )}

          {activeTab === "accommodaties" && (
            <AccommodatiesView accommodations={data.accommodations} onAddAccommodation={handleAddAccommodation} onUpdateAccommodation={handleUpdateAccommodation} onDeleteAccommodation={handleDeleteAccommodation} />
          )}

          {activeTab === "camper" && (
            <CamperView
              camper={data.camper}
              onUpdateCamper={handleUpdateCamper}
            />
          )}

          {activeTab === "budget" && (
            <BudgetView
              expenses={data.budgetExpenses}
              categoryBudgets={data.categoryBudgets}
              budgetDashboard={data.budgetDashboard}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onUpdateExpense={handleUpdateExpense}
            />
          )}

          {activeTab === "documenten" && (
            <DocumentenView
              documents={data.documents}
              onAddDocument={handleAddDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === "gezondheid" && (
            <GezondheidView
              familyMembers={data.familyMembers}
              onUpdateFamilyMember={handleUpdateFamilyMember}
              onAddFamilyMember={handleAddFamilyMember}
              onDeleteFamilyMember={handleDeleteFamilyMember}
            />
          )}

          {activeTab === "paklijst" && (
            <PaklijstView
              items={data.packingItems}
              people={data.packingPeople || []}
              onAddPerson={handleAddPackingPerson}
              onDeletePerson={handleDeletePackingPerson}
              onUpdatePerson={handleUpdatePackingPerson}
              onAddItem={handleAddPackingItem}
              onUpdateItem={handleUpdatePackingItem}
              onDeleteItem={handleDeletePackingItem}
              onUpdateStatus={handleUpdatePackingItemStatus}
            />
          )}

          {activeTab === "dagboek" && (
            <DagboekView
              journals={data.journals}
              photos={data.photos}
              timeline={data.timeline}
              onAddJournal={handleAddJournal}
              onAddPhoto={handleAddPhoto}
              onDeleteJournal={handleDeleteJournal}
              onDeletePhoto={handleDeletePhoto}
            />
          )}

          {activeTab === "kaarten" && (
            <React.Suspense fallback={<ViewLoader label="Reiskaart laden…" />}>
              <KaartenView
                hikes={data.hikes}
                timeline={data.timeline}
                countryPlans={data.countries}
                savedLocations={data.savedLocations}
                accommodations={data.accommodations}
                activities={data.activities}
                onNavigate={setActiveTab}
                onAddLocation={handleAddLocation}
                onDeleteLocation={handleDeleteLocation}
                onUpdateLocation={handleUpdateLocation}
                onSaveCoordinates={handleSaveMapCoordinates}
              />
            </React.Suspense>
          )}

          {activeTab === "activiteiten" && (
            <ActiviteitenView activities={data.activities} onUpdateActivity={handleUpdateActivity} onAddActivity={handleAddActivity} onDeleteActivity={handleDeleteActivity} />
          )}

          {activeTab === "checklist" && (
            <ChecklistView
              checklists={data.checklists}
              onToggleCheckItem={handleToggleCheckItem}
              onAddCheckItem={handleAddCheckItem}
              onDeleteCheckItem={handleDeleteCheckItem}
              onUpdateCheckItem={handleUpdateCheckItem}
            />
          )}

          {activeTab === "weer" && (
            <WeerView timeline={data.timeline} />
          )}

          {activeTab === "valuta" && (
            <ValutaView currencies={data.overview.currencies || {}} onUpdateCurrencies={handleUpdateCurrencies} />
          )}

          {activeTab === "nood" && (
            <NoodView
              emergencyContacts={data.emergencies}
              countries={data.countries}
              profile={data.emergencyProfile}
              onUpdateProfile={handleUpdateEmergencyProfile}
              onUpdateContacts={handleUpdateEmergencyContacts}
            />
          )}

          {activeTab === "statistieken" && (
            <StatistiekenView
              categoryBudgets={data.categoryBudgets}
              budgetDashboard={data.budgetDashboard}
              overview={data.overview}
            />
          )}

          {activeTab === "more" && (
            <MoreView
              data={data}
              setActiveTab={setActiveTab}
              onOpenExport={() => setExportOpen(true)}
              onOpenExcelImport={() => setExcelImportOpen(true)}
              canInstall={Boolean(installPrompt)}
              isInstalled={isInstalled}
              onInstall={handleInstallApp}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        data={data}
        setActiveTab={setActiveTab}
      />


      <ExcelImportModal
        isOpen={excelImportOpen}
        onClose={() => setExcelImportOpen(false)}
        data={data}
        onDataLoaded={(nextData) => {
          setData(nextData);
          setActiveTab("budget");
        }}
      />

      {/* Export & Sync Modal */}
      <ExportSyncModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        data={data}
        onDataLoaded={(newData) => setData(newData)}
      />
    </div>
    </AppErrorBoundary>
  );
}

export default App;

const ViewLoader = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">{label}</div>
);
