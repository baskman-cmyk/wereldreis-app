import React, { useMemo, useState } from "react";
import { Building2, ChevronDown, HeartPulse, Hospital, Pencil, Phone, Plus, Save, ShieldAlert, Trash2, X } from "lucide-react";
import type { CountryPlan, EmergencyCountryProfile, EmergencyProfile } from "../types";

interface NoodViewProps {
  emergencyContacts?: EmergencyCountryProfile[];
  countries?: CountryPlan[];
  profile?: EmergencyProfile;
  onUpdateProfile?: (profile: EmergencyProfile) => void;
  onUpdateContacts?: (profiles: EmergencyCountryProfile[]) => void;
}

const normalizeProfile = (item: any, index: number): EmergencyCountryProfile => ({
  ...item,
  id: item.id || `emergency-${String(item.country || item.land || index).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  country: item.country || item.land || "Land nog niet ingevuld",
  generalEmergency: item.generalEmergency || item.alarmnummer || "",
  police: item.police || item.politie || "",
  ambulance: item.ambulance || "",
  fireDepartment: item.fireDepartment || "",
  touristPolice: item.touristPolice || "",
  embassyName: item.embassyName || item.embassy?.name || "",
  embassyPhone: item.embassyPhone || item.embassy?.phone || "",
  nearestHospital: item.nearestHospital || item.ziekenhuizen?.[0]?.name || "",
  hospitalAddress: item.hospitalAddress || item.ziekenhuizen?.[0]?.address || "",
  hospitalPhone: item.hospitalPhone || item.ziekenhuizen?.[0]?.phone || "",
  insurerEmergencyPhone: item.insurerEmergencyPhone || item.verzekeraarHotline || "",
  netherlandsWorldwide: item.netherlandsWorldwide || "",
  medicalHelp: item.medicalHelp || "",
  specialIsis: item.specialIsis || "",
  czHelpline: item.czHelpline || "",
  important: item.important || "",
  notes: item.notes || item.arts || "",
});
const countryName = (country: CountryPlan) => country.country || country.land || country.name || "";
const emptyCountry = (name = "", flag = "🌍"): EmergencyCountryProfile => ({ id: `emergency-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, country: name, flag, generalEmergency: "", police: "", ambulance: "", fireDepartment: "", touristPolice: "", embassyName: "", embassyPhone: "", nearestHospital: "", hospitalAddress: "", hospitalPhone: "", insurerEmergencyPhone: "", roadsideAssistancePhone: "", netherlandsWorldwide: "", medicalHelp: "", specialIsis: "", czHelpline: "", important: "", notes: "" });
const telHref = (phone: string) => {
  const firstNumber = phone.split(/\n/).map((line) => line.match(/\+?[\d][\d\s()-]*/)?.[0]).find(Boolean) || phone;
  return `tel:${firstNumber.replace(/[^+\d]/g, "")}`;
};

export const NoodView: React.FC<NoodViewProps> = ({ emergencyContacts = [], countries = [], profile, onUpdateProfile, onUpdateContacts }) => {
  const contacts = useMemo(() => emergencyContacts.map(normalizeProfile), [emergencyContacts]);
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<EmergencyCountryProfile>();
  const [profileDraft, setProfileDraft] = useState<EmergencyProfile>();
  const tripCountries = countries.map((item) => ({ name: countryName(item), flag: item.flag || "🌍" })).filter((item) => item.name);
  const missingCountries = tripCountries.filter((tripCountry) => !contacts.some((contact) => contact.country.toLowerCase() === tripCountry.name.toLowerCase()));
  const displayedContacts = draft && !contacts.some((item) => item.id === draft.id) ? [draft, ...contacts] : contacts;

  const beginEdit = (item: EmergencyCountryProfile) => {
    setDraft({ ...item });
    setEditingId(item.id);
  };
  const saveCountry = () => {
    if (!draft?.country.trim()) return;
    const exists = contacts.some((item) => item.id === draft.id);
    onUpdateContacts?.(exists ? contacts.map((item) => item.id === draft.id ? draft : item) : [...contacts, draft]);
    setEditingId(undefined);
    setDraft(undefined);
  };
  const addMissingCountries = () => {
    onUpdateContacts?.([...contacts, ...missingCountries.map((item) => emptyCountry(item.name, item.flag))]);
  };
  const removeCountry = (id: string) => {
    if (window.confirm("Dit SOS-landprofiel verwijderen?")) onUpdateContacts?.(contacts.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-rose-700 to-rose-900 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-200">Offline beschikbaar</p><h1 className="mt-1 text-3xl font-black">Noodgevallen & SOS</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-rose-100">Vaste gezinsgegevens en per land de belangrijkste alarm-, ambassade-, ziekenhuis- en verzekeringsnummers.</p></div>
          <ShieldAlert className="hidden h-14 w-14 text-rose-200 sm:block" />
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-rose-600">Altijd bij de hand</p><h2 className="mt-1 text-lg font-black">Gezin, huisarts & verzekering</h2></div>{onUpdateProfile && <button type="button" onClick={() => profileDraft ? setProfileDraft(undefined) : setProfileDraft({ ...(profile || {}) })} className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-700">{profileDraft ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</button>}</div>
        {profileDraft ? <div className="mt-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Noodcontact naam" value={profileDraft.contactName || ""} onChange={(value) => setProfileDraft({ ...profileDraft, contactName: value })} /><Field label="Noodcontact telefoon" value={profileDraft.contactPhone || ""} onChange={(value) => setProfileDraft({ ...profileDraft, contactPhone: value })} /><Field label="Huisarts" value={profileDraft.doctorName || ""} onChange={(value) => setProfileDraft({ ...profileDraft, doctorName: value })} /><Field label="Huisarts telefoon" value={profileDraft.doctorPhone || ""} onChange={(value) => setProfileDraft({ ...profileDraft, doctorPhone: value })} /><Field label="Verzekeraar" value={profileDraft.insurer || ""} onChange={(value) => setProfileDraft({ ...profileDraft, insurer: value })} /><Field label="Polisnummer" value={profileDraft.policyNumber || ""} onChange={(value) => setProfileDraft({ ...profileDraft, policyNumber: value })} /></div><button type="button" onClick={() => { onUpdateProfile?.(profileDraft); setProfileDraft(undefined); }} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 text-sm font-black text-white"><Save className="h-4 w-4" />Opslaan</button></div> : <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><EmergencyValue icon={Phone} label="Noodcontact" value={profile?.contactName} phone={profile?.contactPhone} /><EmergencyValue icon={HeartPulse} label="Huisarts" value={profile?.doctorName} phone={profile?.doctorPhone} /><EmergencyValue icon={ShieldAlert} label="Verzekeraar" value={profile?.insurer || profile?.globalInsurance} phone={profile?.emergencyPhone} /><EmergencyValue icon={ShieldAlert} label="Polisnummer" value={profile?.policyNumber} /></div>}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-black">Landprofielen</h2><p className="text-sm text-slate-500">{contacts.length} landen · controleer nummers kort voor vertrek.</p></div>
        <div className="flex flex-wrap gap-2">{missingCountries.length > 0 && <button type="button" onClick={addMissingCountries} className="flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><Plus className="h-4 w-4" />{missingCountries.length} reislanden toevoegen</button>}<button type="button" onClick={() => { const next = emptyCountry(); setDraft(next); setEditingId(next.id); }} className="flex h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />Land toevoegen</button></div>
      </section>

      <div className="space-y-3">
        {displayedContacts.map((item) => {
          const editing = editingId === item.id && draft;
          return <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 p-4"><span className="text-3xl">{item.flag || "🌍"}</span><div className="min-w-0 flex-1"><h3 className="font-black text-slate-900 dark:text-white">{item.country}</h3><p className="text-xs text-slate-500">Alarmnummer: {item.generalEmergency || "nog invullen"}</p></div>{onUpdateContacts && <><button type="button" onClick={() => editing ? (setEditingId(undefined), setDraft(undefined)) : beginEdit(item)} className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-700">{editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</button><button type="button" onClick={() => removeCountry(item.id)} className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-rose-600 dark:border-slate-700" aria-label="Landprofiel verwijderen"><Trash2 className="h-4 w-4" /></button></>}</div>
            {editing ? <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40"><div className="grid gap-3 sm:grid-cols-2"><Field label="Land" value={draft.country} onChange={(value) => setDraft({ ...draft, country: value })} /><Field label="Vlag (emoji)" value={draft.flag || ""} onChange={(value) => setDraft({ ...draft, flag: value })} /><Field label="Algemeen alarmnummer" value={draft.generalEmergency || ""} onChange={(value) => setDraft({ ...draft, generalEmergency: value })} /><Field label="Politie" value={draft.police || ""} onChange={(value) => setDraft({ ...draft, police: value })} /><Field label="Ambulance" value={draft.ambulance || ""} onChange={(value) => setDraft({ ...draft, ambulance: value })} /><Field label="Brandweer" value={draft.fireDepartment || ""} onChange={(value) => setDraft({ ...draft, fireDepartment: value })} /><Field label="Ambassade / consulaat" value={draft.embassyName || ""} onChange={(value) => setDraft({ ...draft, embassyName: value })} /><Field label="Nederland Wereldwijd" value={draft.netherlandsWorldwide || ""} onChange={(value) => setDraft({ ...draft, netherlandsWorldwide: value })} /><Field label="Ziekenhuis / medische hulp" value={draft.medicalHelp || draft.nearestHospital || ""} onChange={(value) => setDraft({ ...draft, medicalHelp: value, nearestHospital: value })} wide /><Field label="Special ISIS" value={draft.specialIsis || ""} onChange={(value) => setDraft({ ...draft, specialIsis: value })} /><Field label="CZ Helpline" value={draft.czHelpline || ""} onChange={(value) => setDraft({ ...draft, czHelpline: value })} /><Field label="Belangrijk" value={draft.important || ""} onChange={(value) => setDraft({ ...draft, important: value, notes: value })} wide /></div><button type="button" onClick={saveCountry} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 text-sm font-black text-white"><Save className="h-4 w-4" />Landprofiel opslaan</button></div> : <details className="group border-t border-slate-100 dark:border-slate-800"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-black text-slate-600 dark:text-slate-300">Alle noodinformatie <ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" /></summary><div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3"><EmergencyValue icon={ShieldAlert} label="Algemeen alarmnummer" value={item.generalEmergency} phone={item.generalEmergency} urgent /><EmergencyValue icon={Phone} label="Politie" value={item.police} /><EmergencyValue icon={HeartPulse} label="Ambulance" value={item.ambulance} /><EmergencyValue icon={Building2} label="Ambassade / consulaat" value={item.embassyName} /><EmergencyValue icon={Phone} label="Nederland Wereldwijd" value={item.netherlandsWorldwide} /><EmergencyValue icon={Hospital} label="Ziekenhuis / medische hulp" value={item.medicalHelp || item.nearestHospital} /><EmergencyValue icon={ShieldAlert} label="Special ISIS" value={item.specialIsis || item.insurerEmergencyPhone} /><EmergencyValue icon={Phone} label="CZ Helpline" value={item.czHelpline} /></div>{(item.important || item.notes) && <p className="mx-4 mb-4 whitespace-pre-line rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><strong>Belangrijk:</strong> {item.important || item.notes}</p>}</details>}
          </article>;
        })}
        {!contacts.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><ShieldAlert className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 font-black">Nog geen landprofielen</h3><p className="mt-1 text-sm text-slate-500">Voeg de landen uit de reis toe en vul daarna de gecontroleerde nummers in.</p></div>}
      </div>
    </div>
  );
};

const EmergencyValue = ({ icon: Icon, label, value, detail, phone, urgent }: { icon: React.ElementType; label: string; value?: string; detail?: string; phone?: string; urgent?: boolean }) => <div className={`rounded-xl p-3 ${urgent ? "bg-rose-50 dark:bg-rose-950/30" : "bg-slate-50 dark:bg-slate-800/60"}`}><p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400"><Icon className="h-3 w-3" />{label}</p><p className="mt-1 break-anywhere text-sm font-black text-slate-800 dark:text-slate-100">{value || "Nog invullen"}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}{phone && <a href={telHref(phone)} className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-black text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-300"><Phone className="h-3.5 w-3.5" />Bellen</a>}</div>;
const Field = ({ label, value, onChange, wide }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) => <label className={`text-xs font-bold text-slate-600 dark:text-slate-300 ${wide ? "sm:col-span-2" : ""}`}>{label}{wide ? <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-900" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-900" />}</label>;

export default NoodView;
