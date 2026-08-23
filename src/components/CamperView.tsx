import React, { useState } from "react";
import { CalendarDays, ExternalLink, MapPin, Pencil, Phone, Plus, Save, Trash2, X } from "lucide-react";
import type { CamperDetails, CarRentalDetails } from "../types";
import { AttachmentListControl } from "./AttachmentListControl";

interface CamperViewProps {
  camper: CamperDetails;
  onUpdateCamper?: (camper: CamperDetails) => void;
}

const pickupOf = (item: CarRentalDetails) => item.pickupLocation || item.ophaallocatie || "";
const dropoffOf = (item: CarRentalDetails) => item.dropoffLocation || item.returnLocation || item.inleverlocatie || "";
const pickupDateOf = (item: CarRentalDetails) => item.pickupDate || item.ophaaldatum || "";
const dropoffDateOf = (item: CarRentalDetails) => item.dropoffDate || item.returnDate || item.inleverdatum || "";
const mapsUrl = (location: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
const formatMoney = (amount: number, currency = "EUR") => new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);

export const CamperView: React.FC<CamperViewProps> = ({ camper, onUpdateCamper }) => {
  const rentals = camper.carRentals?.length ? camper.carRentals : camper.carOption ? [camper.carOption] : [];
  const [editingIndex, setEditingIndex] = useState<number>();
  const [draft, setDraft] = useState<CarRentalDetails>();

  const updateRental = (index: number, rental: CarRentalDetails) => {
    const normalized: CarRentalDetails = {
      ...rental,
      pickupLocation: pickupOf(rental),
      ophaallocatie: pickupOf(rental),
      dropoffLocation: dropoffOf(rental),
      returnLocation: dropoffOf(rental),
      inleverlocatie: dropoffOf(rental),
      pickupDate: pickupDateOf(rental),
      ophaaldatum: pickupDateOf(rental),
      dropoffDate: dropoffDateOf(rental),
      returnDate: dropoffDateOf(rental),
      inleverdatum: dropoffDateOf(rental),
    };
    const nextRentals = rentals.map((item, itemIndex) => itemIndex === index ? normalized : item);
    onUpdateCamper?.({ ...camper, carOption: nextRentals[0] ?? camper.carOption, carRentals: nextRentals });
  };
  const addRental = () => {
    const rental: CarRentalDetails = { id: `rental-${Date.now()}`, company: "", model: "", pickupLocation: "", dropoffLocation: "", pickupDate: "", dropoffDate: "", bookingReference: "", currency: "EUR" };
    const nextRentals = [...rentals, rental];
    onUpdateCamper?.({ ...camper, carOption: nextRentals[0], carRentals: nextRentals });
    setEditingIndex(nextRentals.length - 1); setDraft(rental);
  };
  const deleteRental = (index: number) => {
    const nextRentals = rentals.filter((_, itemIndex) => itemIndex !== index);
    onUpdateCamper?.({ ...camper, carOption: nextRentals[0] || {}, carRentals: nextRentals });
  };

  const beginEdit = (index: number, rental: CarRentalDetails) => {
    setEditingIndex(index);
    setDraft({ ...rental, pickupLocation: pickupOf(rental), dropoffLocation: dropoffOf(rental), pickupDate: pickupDateOf(rental), dropoffDate: dropoffDateOf(rental) });
  };

  return (
    <div className="space-y-4">
      {onUpdateCamper && <div className="flex justify-end"><button type="button" onClick={addRental} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />Huurauto of camper toevoegen</button></div>}
      {!rentals.length && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-black">Nog geen huurauto of camper</h2></div>}
      {rentals.map((rental, index) => {
        const pickup = pickupOf(rental);
        const dropoff = dropoffOf(rental);
        const editing = editingIndex === index && draft;
        const price = Number(rental.totalPrice ?? rental.price ?? rental.dagprijsEur ?? 0);
        return (
          <article key={rental.id || `${pickup}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-600">Huurauto / camper</p>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{rental.company || rental.verhuurder || "Verhuurder nog niet ingevuld"}</h2>
                <p className="text-sm text-slate-500">{rental.model || rental.modelName || rental.vehicleType || rental.category || "Voertuig nog niet ingevuld"}</p>
              </div>
              <div className="flex items-center gap-2">
                {price > 0 && <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 sm:block">{formatMoney(price, rental.currency || "EUR")}</span>}
                {onUpdateCamper && <button type="button" onClick={() => editing ? (setEditingIndex(undefined), setDraft(undefined)) : beginEdit(index, rental)} className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-700" aria-label="Huurgegevens bewerken">{editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</button>}
                {onUpdateCamper && !editing && <button type="button" onClick={() => window.confirm("Deze huurboeking verwijderen?") && deleteRental(index)} className="rounded-xl border border-slate-200 p-2 text-rose-600 dark:border-slate-700"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <LocationCard label="Ophalen" location={pickup} date={pickupDateOf(rental)} time={rental.pickupTime} />
              <LocationCard label="Inleveren" location={dropoff} date={dropoffDateOf(rental)} time={rental.returnTime || rental.dropoffTime} />
            </div>
            {(rental.bookingReference || rental.reservationNumber) && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-800 dark:bg-violet-950/30 dark:text-violet-300">Boekingsnummer: {rental.bookingReference || rental.reservationNumber}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {pickup && <a href={mapsUrl(pickup)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><MapPin className="h-4 w-4" />Ophaallocatie <ExternalLink className="h-3 w-3" /></a>}
              {dropoff && <a href={mapsUrl(dropoff)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><MapPin className="h-4 w-4" />Inleverlocatie <ExternalLink className="h-3 w-3" /></a>}
              {rental.phone && <a href={`tel:${rental.phone.replace(/[^+\d]/g, "")}`} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Phone className="h-4 w-4" />{rental.phone}</a>}
              {rental.website && <a href={rental.website} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">Website <ExternalLink className="h-3 w-3" /></a>}
            </div>

            {editing && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <h3 className="font-black">Huurgegevens aanvullen</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Verhuurder" value={draft.company || draft.verhuurder || ""} onChange={(value) => setDraft({ ...draft, company: value })} />
                  <Field label="Voertuig / model" value={draft.model || ""} onChange={(value) => setDraft({ ...draft, model: value })} />
                  <Field label="Boekingsnummer" value={draft.bookingReference || ""} onChange={(value) => setDraft({ ...draft, bookingReference: value })} />
                  <Field label="Ophaaladres" value={draft.pickupLocation || ""} onChange={(value) => setDraft({ ...draft, pickupLocation: value })} wide />
                  <Field label="Inleveradres" value={draft.dropoffLocation || ""} onChange={(value) => setDraft({ ...draft, dropoffLocation: value })} wide />
                  <Field label="Ophaaldatum" type="date" value={draft.pickupDate || ""} onChange={(value) => setDraft({ ...draft, pickupDate: value })} />
                  <Field label="Ophaaltijd" type="time" value={draft.pickupTime || ""} onChange={(value) => setDraft({ ...draft, pickupTime: value })} />
                  <Field label="Inleverdatum" type="date" value={draft.dropoffDate || ""} onChange={(value) => setDraft({ ...draft, dropoffDate: value })} />
                  <Field label="Inlevertijd" type="time" value={draft.returnTime || ""} onChange={(value) => setDraft({ ...draft, returnTime: value })} />
                  <Field label="Telefoon" type="tel" value={draft.phone || ""} onChange={(value) => setDraft({ ...draft, phone: value })} />
                  <Field label="Website" type="url" value={draft.website || ""} onChange={(value) => setDraft({ ...draft, website: value })} />
                  <Field label="Totale prijs" type="number" value={String(draft.totalPrice || "")} onChange={(value) => setDraft({ ...draft, totalPrice: Number(value) || undefined })} />
                  <Field label="Valuta" value={draft.currency || "EUR"} onChange={(value) => setDraft({ ...draft, currency: value.toUpperCase() })} />
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Notities<textarea value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900" /></label>
                </div>
                <button type="button" onClick={() => { updateRental(index, draft); setEditingIndex(undefined); setDraft(undefined); }} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#174A7E] text-sm font-black text-white"><Save className="h-4 w-4" />Opslaan</button>
              </div>
            )}

            {rental.notes && ![rental.company, rental.model, rental.phone].filter(Boolean).every((value) => rental.notes?.includes(String(value))) && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{rental.notes}</p>}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Huurcontract en boeking</p><AttachmentListControl attachments={rental.contractPdfs} legacyAttachment={rental.contractPdf} label="Contract of boeking toevoegen" onChange={(contractPdfs) => updateRental(index, { ...rental, contractPdfs, contractPdf: contractPdfs[0] })} /></div>
              <div><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Verzekering</p><AttachmentListControl attachments={rental.insurancePdfs} legacyAttachment={rental.insurancePdf} label="Verzekeringsbestand toevoegen" onChange={(insurancePdfs) => updateRental(index, { ...rental, insurancePdfs, insurancePdf: insurancePdfs[0] })} /></div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

const LocationCard = ({ label, location, date, time }: { label: string; location: string; date: string; time?: string }) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="break-anywhere mt-1 font-black text-slate-900 dark:text-white">{location || "Adres nog niet ingevuld"}</p><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{date || "Datum nog niet ingevuld"}{time ? ` · ${time}` : ""}</p></div>
);
const Field = ({ label, value, onChange, type = "text", wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean }) => <label className={`text-xs font-bold text-slate-600 dark:text-slate-300 ${wide ? "sm:col-span-2" : ""}`}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#39B8C8] dark:border-slate-700 dark:bg-slate-900" /></label>;

export default CamperView;
