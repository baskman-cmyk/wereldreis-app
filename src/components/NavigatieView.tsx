import React, { useState } from "react";
import {
  MapPin,
  Globe,
  Clock,
  Phone,
  DollarSign,
  Star,
  ExternalLink,
  Plus,
  Navigation,
  Search,
} from "lucide-react";
import { SavedLocation, GPSLocation } from "../types";

interface NavigatieViewProps {
  locations: SavedLocation[];
  onAddLocation: (loc: SavedLocation) => void;
}

export const NavigatieView: React.FC<NavigatieViewProps> = ({
  locations,
  onAddLocation,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // New Location Form State
  const [naam, setNaam] = useState("");
  const [adres, setAdres] = useState("");
  const [website, setWebsite] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [openingstijden, setOpeningstijden] = useState("");
  const [notities, setNotities] = useState("");
  const [category, setCategory] = useState<SavedLocation["category"]>("sight");
  const [rating, setRating] = useState(5);

  const filtered = locations.filter((loc) => {
    const matchesCat = filterCategory === "all" || loc.category === filterCategory;
    const matchesQ =
      loc.naam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.adres.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQ;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naam || !adres) return;
    const newLoc: SavedLocation = {
      id: "loc-" + Date.now(),
      naam,
      adres,
      website: website || undefined,
      telefoon: telefoon || undefined,
      openingstijden: openingstijden || undefined,
      gps: { lat: -26.39, lng: 153.08, label: naam },
      notities,
      rating,
      category,
    };
    onAddLocation(newLoc);
    setNaam("");
    setAdres("");
    setWebsite("");
    setTelefoon("");
    setOpeningstijden("");
    setNotities("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#39B8C8]" />
            Bewaarde Offline Locaties
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sla belangrijke adressen, supermarkten, bezienswaardigheden en telefoonnummers op.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#174A7E] hover:bg-[#1d5c9c] text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4 text-[#39B8C8]" />
          <span>Locatie Toevoegen</span>
        </button>
      </div>

      {/* Add Location Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4 animate-in zoom-in-95 duration-150"
        >
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Nieuwe Offline Locatie Opslaan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Naam van de locatie *"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
              required
            />
            <input
              type="text"
              placeholder="Adres *"
              value={adres}
              onChange={(e) => setAdres(e.target.value)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
              required
            />
            <input
              type="text"
              placeholder="Website URL (optioneel)"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
            />
            <input
              type="text"
              placeholder="Telefoonnummer (optioneel)"
              value={telefoon}
              onChange={(e) => setTelefoon(e.target.value)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
            />
            <input
              type="text"
              placeholder="Openingstijden (bijv. 08:00 - 20:00)"
              value={openingstijden}
              onChange={(e) => setOpeningstijden(e.target.value)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
            >
              <option value="sight">Bezienswaardigheid</option>
              <option value="supermarket">Supermarkt</option>
              <option value="restaurant">Restaurant</option>
              <option value="camping">Camping / RV Park</option>
              <option value="repair">Garage / Reparatie</option>
              <option value="other">Overig</option>
            </select>
          </div>
          <textarea
            placeholder="Persoonlijke notities & beoordeling..."
            value={notities}
            onChange={(e) => setNotities(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#39B8C8] text-[#174A7E] font-bold text-xs rounded-xl shadow-2xs hover:brightness-105"
            >
              Opslaan
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "sight", "supermarket", "restaurant", "camping", "repair"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                filterCategory === cat
                  ? "bg-[#174A7E] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {cat === "all" ? "Alle Categorieën" : cat}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Zoek bewaarde locatie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((loc) => (
          <div
            key={loc.id}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                  {loc.naam}
                </h3>
                <span className="flex items-center gap-1 text-amber-500 text-xs font-bold shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {loc.rating}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5 text-[#39B8C8] shrink-0" />
                {loc.adres}
              </p>

              {loc.openingstijden && (
                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {loc.openingstijden}
                </p>
              )}

              {loc.telefoon && (
                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {loc.telefoon}
                </p>
              )}

              {loc.notities && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-400 italic">
                  "{loc.notities}"
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(loc.naam + " " + loc.adres)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-[#174A7E] dark:text-[#39B8C8] hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" /> Google Maps Route
              </a>

              {loc.website && (
                <a
                  href={loc.website}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  title="Website Openen"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
