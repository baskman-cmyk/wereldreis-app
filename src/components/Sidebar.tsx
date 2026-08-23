import React from "react";
import { BedDouble, CalendarDays, CarFront, Map, Route, Ticket, Grid2X2 } from "lucide-react";
import { TabType } from "../types";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: "today" as TabType, label: "Vandaag", icon: CalendarDays },
    { id: "reisplanning" as TabType, label: "Reis", icon: Map },
    { id: "accommodaties" as TabType, label: "Verblijf", icon: BedDouble },
    { id: "vervoer" as TabType, label: "Vervoer", icon: CarFront },
    { id: "navigatie" as TabType, label: "Kaart & route", icon: Route },
    { id: "activiteiten" as TabType, label: "Activiteiten", icon: Ticket },
    { id: "more" as TabType, label: "Meer", icon: Grid2X2 },
  ];

  return (
    <aside className="sticky top-20 hidden h-fit w-60 shrink-0 flex-col rounded-3xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:flex">
      <div className="px-3 pb-3 pt-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navigatie</p>
      </div>
      <nav aria-label="Hoofdnavigatie" className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active ? "bg-[#174A7E] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-300" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
