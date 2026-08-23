export interface GeocodedLocation { lat: number; lng: number; label?: string; }

// Photon is de open geocoder van Komoot. Alleen online gebruikt; de app bewaart
// het resultaat daarna in de eigen lokale reisgegevens voor offline gebruik.
export async function geocodeAddress(query: string): Promise<GeocodedLocation | undefined> {
  const response = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Adreszoekdienst is tijdelijk niet bereikbaar.");
  const data = await response.json();
  const feature = data?.features?.[0];
  const [lng, lat] = feature?.geometry?.coordinates || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng, label: query };
}
