import React, { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Euro,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Route,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { JournalEntry, PhotoItem, TimelineDay } from "../types";
import { storeOptimizedImage, deleteFile } from "../utils/fileStore";
import { useFileSrc } from "../hooks/useFileSrc";

const PhotoImg: React.FC<{ photo: PhotoItem; alt?: string; className?: string }> = ({ photo, alt, className }) => {
  const src = useFileSrc(photo.fileId, photo.dataUrl || photo.url);
  if (!src) return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 ${className || ""}`} />;
  return <img src={src} alt={alt || photo.caption} className={className} />;
};

interface DagboekViewProps {
  journals: JournalEntry[];
  photos: PhotoItem[];
  timeline: TimelineDay[];
  onAddJournal: (entry: JournalEntry) => void;
  onAddPhoto: (photo: PhotoItem) => void;
  onDeleteJournal: (id: string) => void;
  onDeletePhoto: (id: string) => void;
}

const isoDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split(/[./-]/).map(Number);
  if (parts.length === 3 && parts[2] > 1000) {
    return `${parts[2]}-${String(parts[1]).padStart(2, "0")}-${String(parts[0]).padStart(2, "0")}`;
  }
  return value;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));

const moodEmoji: Record<JournalEntry["stemming"], string> = {
  Blij: "😊",
  Dankbaar: "🙏",
  Moe: "😴",
  Avontuurlijk: "🧭",
  Relaxed: "😌",
};

export const DagboekView: React.FC<DagboekViewProps> = ({
  journals,
  photos,
  timeline,
  onAddJournal,
  onAddPhoto,
  onDeleteJournal,
  onDeletePhoto,
}) => {
  const sortedDays = useMemo(
    () => [...timeline].sort((a, b) => a.date.localeCompare(b.date)),
    [timeline],
  );

  const initialIndex = useMemo(() => {
    if (!sortedDays.length) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const exact = sortedDays.findIndex((day) => day.date === today);
    if (exact >= 0) return exact;
    const next = sortedDays.findIndex((day) => day.date > today);
    return next >= 0 ? next : sortedDays.length - 1;
  }, [sortedDays]);

  const [dayIndex, setDayIndex] = useState(initialIndex);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);

  const selectedDay = sortedDays[dayIndex];
  const selectedDate = selectedDay?.date ?? new Date().toISOString().slice(0, 10);
  const journal = journals.find((item) => isoDate(item.datum) === selectedDate);
  const dayPhotos = photos.filter((item) => isoDate(item.datum) === selectedDate);
  const dayExpenses = selectedDay?.uitgaven ?? [];
  const dayTotal = dayExpenses.reduce((sum, item) => sum + item.amountEur, 0);

  const [tekst, setTekst] = useState("");
  const [hoogtepunt, setHoogtepunt] = useState("");
  const [dieptepunt, setDieptepunt] = useState("");
  const [les, setLes] = useState("");
  const [herinnering, setHerinnering] = useState("");
  const [stemming, setStemming] = useState<JournalEntry["stemming"]>("Dankbaar");

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<{ fileId: string; previewUrl: string; name: string; size: number; type: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoActivity, setPhotoActivity] = useState("Reisdag");

  if (!selectedDay) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-[#39B8C8]" />
        <h2 className="font-bold text-slate-900 dark:text-white">Nog geen reisdagen</h2>
        <p className="mt-1 text-sm text-slate-500">Voeg eerst dagen toe aan de tijdlijn.</p>
      </div>
    );
  }

  const submitJournal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!tekst.trim()) return;
    onAddJournal({
      id: journal?.id || `journal-${Date.now()}`,
      datum: selectedDate,
      land: selectedDay.land,
      plaats: selectedDay.plaats,
      tekst: tekst.trim(),
      stemming,
      hoogtepunt: hoogtepunt.trim() || "Niet ingevuld",
      dieptepunt: dieptepunt.trim() || "Geen",
      geleerdeLessen: les.trim() || "Niet ingevuld",
      mooisteFoto: dayPhotos[0]?.url ?? "",
      favorieteHerinnering: herinnering.trim() || hoogtepunt.trim() || "Niet ingevuld",
    });
    setShowJournalForm(false);
    setTekst("");
    setHoogtepunt("");
    setDieptepunt("");
    setLes("");
    setHerinnering("");
  };

  const submitPhoto = (event: React.FormEvent) => {
    event.preventDefault();
    const externalUrl = photoUrl.trim();
    if ((!photoFile && !externalUrl) || !photoCaption.trim()) return;
    onAddPhoto({
      id: `photo-${Date.now()}`,
      url: photoFile ? "" : externalUrl,
      fileId: photoFile?.fileId,
      caption: photoCaption.trim(),
      datum: selectedDate,
      land: selectedDay.land,
      plaats: selectedDay.plaats,
      activiteit: photoActivity.trim() || "Reisdag",
      albumName: `${selectedDay.land} – ${selectedDay.plaats}`,
      gps: selectedDay.gps,
    });
    setPhotoUrl("");
    setPhotoFile(null);
    setPhotoCaption("");
    setPhotoActivity("Reisdag");
    setShowPhotoForm(false);
  };

  const closePhotoForm = () => {
    // Een net gekozen foto die nooit aan het dagboek is toegevoegd, meteen opruimen in plaats van
    // te wachten tot de achtergrond-opschoning (die een concept-upload bewust 30 minuten met rust
    // laat, zie fileStore.ts).
    if (photoFile?.fileId) void deleteFile(photoFile.fileId).catch((cause) => console.error("Concept-foto kon niet worden opgeruimd:", cause));
    setPhotoUrl("");
    setPhotoFile(null);
    setPhotoError("");
    setPhotoCaption("");
    setPhotoActivity("Reisdag");
    setShowPhotoForm(false);
  };

  const photoProcessingRef = useRef(false);
  const handlePhotoFileChange = async (file?: File) => {
    if (!file || photoProcessingRef.current) return;
    photoProcessingRef.current = true;
    setPhotoBusy(true); setPhotoError("");
    try {
      const meta = await storeOptimizedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoFile({ fileId: meta.id, previewUrl, name: meta.name, size: meta.size, type: meta.type });
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : "De foto kon niet worden opgeslagen. Mogelijk is de lokale opslag vol.");
    } finally {
      photoProcessingRef.current = false;
      setPhotoBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-[#174A7E] to-[#12375d] p-5 text-white sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-cyan-200">
                <span className="rounded-full bg-white/10 px-3 py-1">Dag {selectedDay.dayNumber}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(selectedDate)}</span>
              </div>
              <h2 className="text-2xl font-black sm:text-3xl">{selectedDay.plaats}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-200">
                <MapPin className="h-4 w-4 text-[#39B8C8]" /> {selectedDay.land}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDayIndex((value) => Math.max(0, value - 1))}
                disabled={dayIndex === 0}
                className="rounded-xl bg-white/10 p-2.5 transition hover:bg-white/20 disabled:opacity-30"
                aria-label="Vorige reisdag"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-24 text-center text-xs font-bold text-slate-200">
                {dayIndex + 1} / {sortedDays.length}
              </div>
              <button
                onClick={() => setDayIndex((value) => Math.min(sortedDays.length - 1, value + 1))}
                disabled={dayIndex === sortedDays.length - 1}
                className="rounded-xl bg-white/10 p-2.5 transition hover:bg-white/20 disabled:opacity-30"
                aria-label="Volgende reisdag"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 lg:grid-cols-4">
          <div className="bg-white p-4 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400"><Route className="h-4 w-4" /> Activiteiten</div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{selectedDay.activiteiten.length}</div>
          </div>
          <div className="bg-white p-4 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400"><Camera className="h-4 w-4" /> Foto’s</div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{dayPhotos.length}</div>
          </div>
          <div className="bg-white p-4 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400"><Euro className="h-4 w-4" /> Uitgaven</div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">€{dayTotal.toFixed(0)}</div>
          </div>
          <div className="bg-white p-4 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400"><CloudSun className="h-4 w-4" /> Overnachting</div>
            <div className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">{selectedDay.overnachting || "Nog niet ingevuld"}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><BookOpen className="h-5 w-5 text-[#39B8C8]" /> Mijn verhaal</h3>
                <p className="mt-0.5 text-xs text-slate-500">Verhaal, stemming en herinneringen van deze reisdag.</p>
              </div>
              <button onClick={() => { setTekst(journal?.tekst || journal?.text || ""); setHoogtepunt(journal?.hoogtepunt || ""); setDieptepunt(journal?.dieptepunt || ""); setLes(journal?.geleerdeLessen || ""); setHerinnering(journal?.favorieteHerinnering || ""); setStemming(journal?.stemming || "Dankbaar"); setShowJournalForm(true); }} className="flex items-center gap-2 rounded-xl bg-[#174A7E] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1d5c9c]">
                {journal ? <Pencil className="h-4 w-4 text-[#39B8C8]" /> : <Plus className="h-4 w-4 text-[#39B8C8]" />} {journal ? "Dagboek aanpassen" : "Schrijf deze dag"}
              </button>
              {journal && <button type="button" onClick={() => window.confirm("Dit dagboekverhaal verwijderen?") && onDeleteJournal(journal.id)} className="flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600"><Trash2 className="h-4 w-4" />Verwijder</button>}
            </div>

            {journal ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-[#174A7E] dark:bg-cyan-950/40 dark:text-cyan-300">{moodEmoji[journal.stemming]} {journal.stemming}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><Star className="mr-1 inline h-3.5 w-3.5" /> {journal.hoogtepunt}</span>
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700 dark:text-slate-300">{journal.tekst}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MemoryCard title="Favoriete herinnering" value={journal.favorieteHerinnering} />
                  <MemoryCard title="Geleerd" value={journal.geleerdeLessen} />
                  <MemoryCard title="Minder leuk" value={journal.dieptepunt} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <Sparkles className="mx-auto mb-2 h-7 w-7 text-[#39B8C8]" />
                <p className="font-bold text-slate-800 dark:text-white">Deze dag heeft nog geen verhaal.</p>
                <p className="mt-1 text-xs text-slate-500">De locatie en reisdatum worden automatisch ingevuld.</p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Camera className="h-5 w-5 text-[#39B8C8]" /> Foto’s van deze dag</h3>
                <p className="mt-0.5 text-xs text-slate-500">Automatisch gegroepeerd op reisdatum.</p>
              </div>
              <button onClick={() => setShowPhotoForm(true)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <ImagePlus className="h-4 w-4 text-[#39B8C8]" /> Foto toevoegen
              </button>
            </div>

            {dayPhotos.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {dayPhotos.map((photo, index) => (
                  <div key={photo.id} className={`group relative overflow-hidden rounded-2xl bg-slate-100 text-left ${index === 0 ? "col-span-2 row-span-2 md:col-span-2" : ""}`}><button onClick={() => setLightboxPhoto(photo)} className="block w-full text-left">
                    <PhotoImg photo={photo} alt={photo.caption} className={`w-full object-cover transition duration-300 group-hover:scale-105 ${index === 0 ? "h-64 md:h-72" : "h-36"}`} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                      <p className="truncate text-xs font-bold">{photo.caption}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-300">{photo.activiteit}</p>
                    </div>
                  </button><button type="button" onClick={() => window.confirm("Deze foto verwijderen?") && onDeletePhoto(photo.id)} className="absolute right-2 top-2 rounded-full bg-black/65 p-2 text-white" aria-label="Foto verwijderen"><Trash2 className="h-4 w-4" /></button></div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700">Nog geen foto’s voor deze dag.</div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-black text-slate-900 dark:text-white">Dagverloop</h3>
            <div className="mt-4 space-y-4 border-l-2 border-cyan-100 pl-4 dark:border-cyan-950">
              {selectedDay.activiteiten.length ? selectedDay.activiteiten.map((activity, index) => (
                <div key={`${activity}-${index}`} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#39B8C8] ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{activity}</p>
                </div>
              )) : <p className="text-xs text-slate-500">Geen activiteiten ingevuld.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-black text-slate-900 dark:text-white">Uitgaven van deze dag</h3>
            <div className="mt-4 space-y-3">
              {dayExpenses.length ? dayExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                  <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{expense.description}</p><p className="text-[10px] capitalize text-slate-400">{expense.category}</p></div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">€{expense.amountEur.toFixed(2)}</p>
                </div>
              )) : <p className="text-xs text-slate-500">Geen uitgaven geregistreerd.</p>}
            </div>
          </section>

          <section className="rounded-3xl bg-[#174A7E] p-5 text-white shadow-sm">
            <MapPin className="h-5 w-5 text-[#39B8C8]" />
            <h3 className="mt-3 font-black">Locatie van de dag</h3>
            <p className="mt-1 text-sm text-slate-200">{selectedDay.plaats}, {selectedDay.land}</p>
            <a href={`https://www.google.com/maps?q=${selectedDay.gps.lat},${selectedDay.gps.lng}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20">Open in Google Maps</a>
          </section>
        </aside>
      </div>

      {showJournalForm && (
        <Modal title={`Dagboek – ${selectedDay.plaats}`} onClose={() => setShowJournalForm(false)}>
          <form onSubmit={submitJournal} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={stemming} onChange={(e) => setStemming(e.target.value as JournalEntry["stemming"])} className="field"><option>Blij</option><option>Dankbaar</option><option>Moe</option><option>Avontuurlijk</option><option>Relaxed</option></select>
              <input value={hoogtepunt} onChange={(e) => setHoogtepunt(e.target.value)} className="field" placeholder="Hoogtepunt van de dag" />
            </div>
            <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} className="field min-h-40" placeholder="Vertel wat jullie vandaag hebben meegemaakt…" required />
            <div className="grid gap-3 sm:grid-cols-2"><input value={herinnering} onChange={(e) => setHerinnering(e.target.value)} className="field" placeholder="Favoriete herinnering" /><input value={les} onChange={(e) => setLes(e.target.value)} className="field" placeholder="Wat hebben jullie geleerd?" /></div>
            <input value={dieptepunt} onChange={(e) => setDieptepunt(e.target.value)} className="field" placeholder="Minder leuk moment (optioneel)" />
            <div className="flex justify-end"><button type="submit" className="flex items-center gap-2 rounded-xl bg-[#174A7E] px-5 py-2.5 text-xs font-bold text-white"><Save className="h-4 w-4" /> Verhaal opslaan</button></div>
          </form>
        </Modal>
      )}

      {showPhotoForm && (
        <Modal title={`Foto toevoegen – ${selectedDay.plaats}`} onClose={closePhotoForm}>
          <form onSubmit={submitPhoto} className="space-y-3">
            <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold dark:border-slate-700 dark:bg-slate-800">Foto vanaf telefoon
              <input type="file" accept="image/*" capture="environment" className="mt-2 block w-full text-xs font-normal" onChange={(event) => void handlePhotoFileChange(event.target.files?.[0])} />
            </label>
            {photoBusy && <p className="text-xs font-semibold text-slate-500">Foto wordt opgeslagen…</p>}
            {photoError && <p className="text-xs font-semibold text-rose-600">{photoError}</p>}
            {photoFile && <img src={photoFile.previewUrl} alt="Voorbeeld" className="max-h-52 w-full rounded-2xl object-contain" />}
            <details><summary className="cursor-pointer text-xs font-bold text-slate-500">Of gebruik een afbeeldingslink</summary><input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="field mt-2" placeholder="Afbeeldingslink (URL)" /></details>
            <input value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} className="field" placeholder="Bijschrift" required />
            <input value={photoActivity} onChange={(e) => setPhotoActivity(e.target.value)} className="field" placeholder="Activiteit" />
            <p className="text-[11px] text-slate-500">De datum, locatie, het land en album worden automatisch gekoppeld aan deze reisdag.</p>
            <div className="flex justify-end"><button type="submit" className="flex items-center gap-2 rounded-xl bg-[#174A7E] px-5 py-2.5 text-xs font-bold text-white"><ImagePlus className="h-4 w-4" /> Foto opslaan</button></div>
          </form>
        </Modal>
      )}

      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightboxPhoto(null)}>
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-950" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxPhoto(null)} className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white"><X className="h-5 w-5" /></button>
            <PhotoImg photo={lightboxPhoto} alt={lightboxPhoto.caption} className="max-h-[75vh] w-full object-contain" />
            <div className="p-5 text-white"><h3 className="font-bold">{lightboxPhoto.caption}</h3><p className="mt-1 text-xs text-slate-400">{lightboxPhoto.activiteit} · {lightboxPhoto.plaats}</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

const MemoryCard = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-700 dark:text-slate-300">{value}</p></div>
);

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between"><h3 className="font-black text-slate-900 dark:text-white">{title}</h3><button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
      {children}
    </div>
  </div>
);
