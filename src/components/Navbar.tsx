import React from "react";
import {
  Search,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Download,
  Compass,
  ShieldAlert,
} from "lucide-react";
import { TripOverview, TabType } from "../types";

interface NavbarProps {
  overview: TripOverview;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  isOnline: boolean;
  onOpenExport: () => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  overview,
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  isOnline,
  onOpenExport,
  onOpenSearch,
}) => {
  return (
    <header aria-label="Bovenbalk" className="sticky top-0 z-40 border-b border-[#39B8C8]/30 bg-[#174A7E] pt-[env(safe-area-inset-top)] text-white shadow-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        {/* Logo & Title */}
        <button type="button" className="flex shrink-0 items-center gap-3 text-left" onClick={() => setActiveTab("today")} aria-label="Ga naar vandaag">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#39B8C8] font-bold text-[#174A7E] shadow-sm">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2 text-white">
              {overview?.title || "Wereldreis 2026"}
            </h1>
            <p className="text-xs text-[#F3E7C8] opacity-90 font-medium">
              Dag {overview?.currentDay || 1} van {overview?.totalDays || 150} • {overview?.currentCity || ""}, {overview?.currentCountry || ""}
            </p>
          </div>
        </button>

        {/* Global Search Bar (Trigger) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded-full text-sm border border-white/15 backdrop-blur-sm transition"
          >
            <Search className="w-4 h-4 text-[#39B8C8]" />
            <span className="flex-1 text-left truncate">Zoek documenten, boekingen, wifi, plekken...</span>
            <kbd className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-semibold bg-white/20 text-white rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-2 lg:gap-3">
          {/* Search Mobile Button */}
          <button
            onClick={onOpenSearch}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 md:hidden"
            title="Zoeken"
          >
            <Search className="w-5 h-5 text-[#39B8C8]" />
          </button>

          {/* Emergency information */}
          <button
            onClick={() => setActiveTab("nood")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-rose-500/20"
            title="Noodgevallen & SOS"
            aria-label="Noodgevallen en SOS openen"
          >
            <ShieldAlert className="h-5 w-5 text-rose-200" />
          </button>

          {/* Export & Sync */}
          <button
            onClick={onOpenExport}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 sm:flex"
            title="Exporteren & Back-up"
          >
            <Download className="w-5 h-5 text-[#F3E7C8]" />
          </button>

          {/* Dark/Light mode toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            title={isDarkMode ? "Lichte modus" : "Donkere modus"}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-[#F3E7C8]" />
            ) : (
              <Moon className="w-5 h-5 text-white/90" />
            )}
          </button>

          {/* Offline Status Indicator */}
          <div
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold md:flex ${
              isOnline
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                : "bg-amber-500/30 text-amber-200 border border-amber-400/40"
            }`}
            title={isOnline ? "Verbonden met internet" : "Offline modus (lokale data beschikbaar)"}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden xl:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden xl:inline">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
