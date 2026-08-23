import React, { useMemo, useState } from "react";
import { BedDouble, CalendarDays, ExternalLink, MapPin, Pencil, Phone, Plus, Save, Trash2, Wifi, X } from "lucide-react";
import type { Accommodation } from "../types";
import { AttachmentListControl } from "./AttachmentListControl";

interface AccommodatiesViewProps {
  accommodations?: Accommodation[];
  onAddAccommodation?: (acc: Accommodation) => void;
  onUpdateAccommodation?: (acc: Accommodation) => void;
  onDeleteAccommodation?: (id: string) => void;
}

const text = (value: unknown) => String(value ?? "").trim();
const addressOf = (item: Accommodation) => text(item.address || item.adres || item.location);
const phoneOf = (item: Accommodation) => text(item.phone || item.telefoon);
const locationFallback = (item: Accommodation) => [item.stad || item.city, item.land || item.country].filter(Boolean).join(", ");
const booleanOf = (item: Accommodation, key: "booked" | "paid" | "cancellable" | "breakfast" | "kitchen" | "pool") => {
  if (key === "cancellable") return item.features?.cancellable ?? item.features?.cancelable ?? item.cancellable ?? item.cancelable;
  return item.features?.[key] ?? item[key];
};
const formatDate = (date?: string) => {
  if (!date) return "Nog niet ingevuld";
  const value = new Date(`${date}T12:00:00`);
  return Number.isNaN(value.getTime()) ? date : new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(value);
};
const mapsUrl = (item: Accommodation) => {
  const lat = Number(item.gps?.lat ?? item.lat);
  const lng = Number(item.gps?.lng ?? item.lng);
  const hasGps = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const query = hasGps ? `${lat},${lng}` : [item.name, addressOf(item) || locationFallback(item)].filter(Boolean).join(", ");
  return item.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const AccommodatiesView: React.FC<AccommodatiesViewProps> = ({ accommodations = [], onAddAccommodation, onUpdateAccommodation, onDeleteAccommodation }) => {
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<Accommodation>();
  const [country, setCountry] = useState("Alle landen");
  const countries = useMemo(() => Array.from(new Set(accommodations.map((item) => text(item.country || item.land)).filter(Boolean))), [accommodations]);
  const visibleAccommodations = country === "Alle landen" ? accommodations : accommodations.filter((item) => text(item.country || item.land) === country);

  const startEdit = (item: Accommodation) => {
    setEditingId(item.id);
    setDraft({
      ...item,
      address: addressOf(item),
      phone: phoneOf(item),
      bookingReference: item.bookingReference || item.boekingsnummer || "",
    });
  };

  const startAdd = () => {
    const item: Accommodation = { id: `accommodation-${Date.now()}`, name: "", checkIn: "", checkOut: "", address: "", country: "", city: "", bookingReference: "", website: "", phone: "" };
    setCountry("Alle landen");
    setEditingId(item.id);
    setDraft(item);
  };

  const saveEdit = () => {
    if (!draft) return;
    const normalized = {
      ...draft,
      adres: draft.address,
      telefoon: draft.phone,
      boekingsnummer: draft.bookingReference,
      land: draft.country,
      stad: draft.city,
    };
    accommodations.some((item) => item.id === draft.id) ? onUpdateAccommodation?.(normalized) : onAddAccommodation?.(normalized);
    setEditingId(undefined);
    setDraft(undefined);
  };

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-[#174A7E] to-[#23689F] p-5 text-white shadow-lg sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Boekingen en contactgegevens</p>
        <h1 className="mt-1 text-3xl font-black">Verblijf</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
          {accommodations.length} accommodaties met adres, route, contact en reserveringsdocument op één plek.
        </p>
      </header>

      <div className="flex justify-end"><button type="button" onClick={startAdd} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />Accommodatie toevoegen</button></div>

      <div className="flex gap-2 overflow-x-auto pb-1">{["Alle landen", ...countries].map((item) => <button key={item} type="button" onClick={() => setCountry(item)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-black ${country === item ? "bg-[#174A7E] text-white" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{item}</button>)}</div>

      {!accommodations.length && !draft && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><BedDouble className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 text-xl font-black">Nog geen accommodaties</h2><p className="mt-2 text-sm text-slate-500">Voeg hierboven je eerste verblijf toe.</p></div>}

      <div className="grid gap-4 xl:grid-cols-2">
        {draft && !accommodations.some((item) => item.id === draft.id) && <AccommodationEditor draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={() => { setDraft(undefined); setEditingId(undefined); }} />}
        {visibleAccommodations.map((item) => {
          const editing = editingId === item.id && draft;
          const address = addressOf(item);
          const phone = phoneOf(item);
          const features = [
            ["Geboekt", booleanOf(item, "booked")],
            ["Betaald", booleanOf(item, "paid")],
            ["Annuleerbaar", booleanOf(item, "cancellable")],
            ["Ontbijt", booleanOf(item, "breakfast")],
            ["Keuken", booleanOf(item, "kitchen")],
            ["Zwembad", booleanOf(item, "pool")],
          ].filter(([, value]) => value === true);

          return (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"><BedDouble className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-anywhere text-lg font-black text-slate-900 dark:text-white">{item.name}</h2>
                  <p className="mt-1 flex items-start gap-1.5 break-anywhere text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{address || locationFallback(item) || "Adres nog niet ingevuld"}</p>
                </div>
                <div className="flex gap-1">{onUpdateAccommodation && <button type="button" onClick={() => editing ? (setEditingId(undefined), setDraft(undefined)) : startEdit(item)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-[#174A7E] dark:border-slate-700" aria-label={editing ? "Bewerken sluiten" : "Accommodatie bewerken"}>{editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</button>}{onDeleteAccommodation && !editing && <button type="button" onClick={() => window.confirm(`Accommodatie “${item.name}” verwijderen?`) && onDeleteAccommodation(item.id)} className="rounded-xl border border-slate-200 p-2 text-rose-600 dark:border-slate-700" aria-label="Accommodatie verwijderen"><Trash2 className="h-4 w-4" /></button>}</div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Info icon={CalendarDays} label="Inchecken" value={formatDate(item.checkIn)} />
                <Info icon={CalendarDays} label="Uitchecken" value={formatDate(item.checkOut)} />
              </div>

              {features.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{features.map(([label]) => <span key={String(label)} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">✓ {label}</span>)}</div>}

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <a href={mapsUrl(item)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><MapPin className="h-4 w-4" />Maps <ExternalLink className="h-3 w-3" /></a>
                {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><Phone className="h-4 w-4" />{phone}</a> : <button type="button" onClick={() => startEdit(item)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 text-xs font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"><Phone className="h-4 w-4" />Nummer toevoegen</button>}
                {item.website && <a href={item.website} target="_blank" rel="noreferrer" className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:col-span-1">Boekingssite <ExternalLink className="h-3 w-3" /></a>}
              </div>

              {(item.bookingReference || item.boekingsnummer || item.wifiCode) && <div className="mt-3 grid gap-2 sm:grid-cols-2">{(item.bookingReference || item.boekingsnummer) && <Info label="Boekingsnummer" value={item.bookingReference || item.boekingsnummer || ""} />}{item.wifiCode && <Info icon={Wifi} label="Wifi" value={item.wifiCode} />}</div>}

              {editing && (
                <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4 dark:border-cyan-900 dark:bg-cyan-950/20">
                  <h3 className="font-black">Accommodatie aanpassen</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Naam" value={draft.name || ""} onChange={(value) => setDraft({ ...draft, name: value })} wide />
                    <Field label="Land" value={draft.country || draft.land || ""} onChange={(value) => setDraft({ ...draft, country: value })} />
                    <Field label="Plaats" value={draft.city || draft.stad || ""} onChange={(value) => setDraft({ ...draft, city: value })} />
                    <Field label="Adres" value={draft.address || ""} onChange={(value) => setDraft({ ...draft, address: value })} wide />
                    <Field label="Inchecken" type="date" value={draft.checkIn || ""} onChange={(value) => setDraft({ ...draft, checkIn: value })} />
                    <Field label="Uitchecken" type="date" value={draft.checkOut || ""} onChange={(value) => setDraft({ ...draft, checkOut: value })} />
                    <Field label="Telefoon" type="tel" value={draft.phone || ""} onChange={(value) => setDraft({ ...draft, phone: value })} />
                    <Field label="Boekingsnummer" value={draft.bookingReference || ""} onChange={(value) => setDraft({ ...draft, bookingReference: value })} />
                    <Field label="Website" type="url" value={draft.website || ""} onChange={(value) => setDraft({ ...draft, website: value })} wide />
                    <Field label="Totale prijs" type="number" value={String(draft.totalPrice ?? draft.price ?? "")} onChange={(value) => setDraft({ ...draft, totalPrice: Number(value) || undefined })} />
                    <Field label="Valuta" value={draft.currency || "EUR"} onChange={(value) => setDraft({ ...draft, currency: value.toUpperCase() })} />
                    <Field label="Wifi-code" value={draft.wifiCode || ""} onChange={(value) => setDraft({ ...draft, wifiCode: value })} wide />
                    <label className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold dark:bg-slate-900"><input type="checkbox" checked={Boolean(draft.booked ?? draft.features?.booked)} onChange={(event) => setDraft({ ...draft, booked: event.target.checked })} />Geboekt</label>
                    <label className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold dark:bg-slate-900"><input type="checkbox" checked={Boolean(draft.paid ?? draft.features?.paid)} onChange={(event) => setDraft({ ...draft, paid: event.target.checked })} />Betaald</label>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Notities<textarea value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900" /></label>
                  </div>
                  <button type="button" onClick={saveEdit} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#174A7E] text-sm font-black text-white"><Save className="h-4 w-4" />Opslaan</button>
                </div>
              )}

              <div className="mt-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Reservering</p>
                <AttachmentListControl attachments={item.reservationPdfs} legacyAttachment={item.reservationPdf} label="Boekingsbestand toevoegen" onChange={(reservationPdfs) => onUpdateAccommodation?.({ ...item, reservationPdfs, reservationPdf: reservationPdfs[0] })} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

const Info = ({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) => (
  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{Icon && <Icon className="h-3 w-3" />}{label}</p><p className="break-anywhere mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{value}</p></div>
);

const Field = ({ label, value, onChange, type = "text", wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean }) => (
  <label className={`text-xs font-bold text-slate-600 dark:text-slate-300 ${wide ? "sm:col-span-2" : ""}`}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#39B8C8] dark:border-slate-700 dark:bg-slate-900" /></label>
);

export default AccommodatiesView;

const AccommodationEditor = ({ draft, setDraft, onSave, onCancel }: { draft: Accommodation; setDraft: (item: Accommodation) => void; onSave: () => void; onCancel: () => void }) => <section className="rounded-3xl border-2 border-cyan-300 bg-white p-4 shadow-sm dark:border-cyan-800 dark:bg-slate-900 sm:p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Nieuwe accommodatie</h2><button type="button" onClick={onCancel} className="rounded-xl p-2"><X className="h-5 w-5" /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Naam" value={draft.name || ""} onChange={(value) => setDraft({ ...draft, name: value })} wide /><Field label="Land" value={draft.country || ""} onChange={(value) => setDraft({ ...draft, country: value })} /><Field label="Plaats" value={draft.city || ""} onChange={(value) => setDraft({ ...draft, city: value })} /><Field label="Adres" value={draft.address || ""} onChange={(value) => setDraft({ ...draft, address: value })} wide /><Field label="Inchecken" type="date" value={draft.checkIn || ""} onChange={(value) => setDraft({ ...draft, checkIn: value })} /><Field label="Uitchecken" type="date" value={draft.checkOut || ""} onChange={(value) => setDraft({ ...draft, checkOut: value })} /><Field label="Telefoon" type="tel" value={draft.phone || ""} onChange={(value) => setDraft({ ...draft, phone: value })} /><Field label="Boekingsnummer" value={draft.bookingReference || ""} onChange={(value) => setDraft({ ...draft, bookingReference: value })} /><Field label="Website" type="url" value={draft.website || ""} onChange={(value) => setDraft({ ...draft, website: value })} wide /><Field label="Totale prijs" type="number" value={String(draft.totalPrice ?? draft.price ?? "")} onChange={(value) => setDraft({ ...draft, totalPrice: Number(value) || undefined })} /><Field label="Valuta" value={draft.currency || "EUR"} onChange={(value) => setDraft({ ...draft, currency: value.toUpperCase() })} /><Field label="Wifi-code" value={draft.wifiCode || ""} onChange={(value) => setDraft({ ...draft, wifiCode: value })} wide /><label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold dark:bg-slate-800"><input type="checkbox" checked={Boolean(draft.booked)} onChange={(event) => setDraft({ ...draft, booked: event.target.checked })} />Geboekt</label><label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold dark:bg-slate-800"><input type="checkbox" checked={Boolean(draft.paid)} onChange={(event) => setDraft({ ...draft, paid: event.target.checked })} />Betaald</label><label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">Notities<textarea value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900" /></label></div><button type="button" disabled={!draft.name?.trim()} onClick={onSave} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#174A7E] text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />Accommodatie opslaan</button></section>;
