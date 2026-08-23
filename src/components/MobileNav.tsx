import React from "react";
import { BedDouble, CalendarDays, CarFront, Map, Ticket, Grid2X2 } from "lucide-react";
import { TabType } from "../types";

interface MobileNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: "today" as TabType, label: "Vandaag", icon: CalendarDays },
    { id: "reisplanning" as TabType, label: "Reis", icon: Map },
    { id: "accommodaties" as TabType, label: "Verblijf", icon: BedDouble },
    { id: "vervoer" as TabType, label: "Vervoer", icon: CarFront },
    { id: "activiteiten" as TabType, label: "Activiteiten", icon: Ticket },
    { id: "more" as TabType, label: "Meer", icon: Grid2X2 },
  ];

  return (
    <nav aria-label="Hoofdnavigatie" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 bg-[#174A7E] px-1 pt-1.5 pb-[calc(.375rem+env(safe-area-inset-bottom))] text-white shadow-2xl lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center py-1 text-[10px] font-bold ${active ? "text-cyan-300" : "text-white/70"}`}
          >
            <Icon className="mb-1 h-5 w-5" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};
