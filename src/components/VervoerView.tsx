import React, { useState } from "react";
import { CarFront, Plane } from "lucide-react";
import type { CamperDetails, Flight } from "../types";
import { VluchtenView } from "./VluchtenView";
import { CamperView } from "./CamperView";

interface VervoerViewProps {
  flights: Flight[];
  camper: CamperDetails;
  onUpdateFlight: (flight: Flight) => void;
  onAddFlight: (flight: Flight) => void;
  onDeleteFlight: (id: string) => void;
  onUpdateCamper: (camper: CamperDetails) => void;
}

export const VervoerView: React.FC<VervoerViewProps> = ({
  flights,
  camper,
  onUpdateFlight,
  onAddFlight,
  onDeleteFlight,
  onUpdateCamper,
}) => {
  const rentalCount = camper.carRentals?.length || (camper.carOption ? 1 : 0);
  const [section, setSection] = useState<"flights" | "rentals">(
    flights.length ? "flights" : "rentals",
  );

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#23689F] p-5 text-white shadow-lg sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Alle verplaatsingen</p>
        <h1 className="mt-1 text-3xl font-black">Vervoer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
          Vluchten, huurauto's en campers staan bij elkaar, inclusief boekingsgegevens, adressen en documenten.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="Soort vervoer">
        <SectionButton
          active={section === "flights"}
          icon={Plane}
          label="Vluchten"
          count={flights.length}
          onClick={() => setSection("flights")}
        />
        <SectionButton
          active={section === "rentals"}
          icon={CarFront}
          label="Huurauto & camper"
          count={rentalCount}
          onClick={() => setSection("rentals")}
        />
      </div>

      {section === "flights" ? (
        <VluchtenView flights={flights} onUpdateFlight={onUpdateFlight} onAddFlight={onAddFlight} onDeleteFlight={onDeleteFlight} />
      ) : (
        <CamperView camper={camper} onUpdateCamper={onUpdateCamper} />
      )}
    </div>
  );
};

const SectionButton = ({ active, icon: Icon, label, count, onClick }: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  count: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${active ? "bg-[#174A7E] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
  >
    <Icon className="h-4 w-4" />
    <span className="truncate">{label}</span>
    <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/15 text-cyan-100" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{count}</span>
  </button>
);

export default VervoerView;
