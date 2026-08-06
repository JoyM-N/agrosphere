/**
 * Farm location helpers — shared by Location screen, weather, and recommend.
 * Mirrors backend REGION_DEFAULTS in weather_service.py.
 */

export const REGION_DEFAULTS: Record<string, { lat: number; lon: number; label: string }> = {
  coastal:   { lat: -4.05, lon: 39.67, label: "Mombasa area (coastal default)" },
  highland:  { lat: -1.29, lon: 36.82, label: "Nairobi / central highlands" },
  semi_arid: { lat: 0.52,  lon: 35.28, label: "Rift / semi-arid belt" },
  sub_humid: { lat: -0.10, lon: 34.75, label: "Lake Victoria basin" },
  arid:      { lat: 3.12,  lon: 35.60, label: "Northern arid belt" },
};

export const REGIONS = [
  { value: "highland",  label: "Highland",  desc: "Above 1500m — cool" },
  { value: "coastal",   label: "Coastal",   desc: "Near the ocean — humid" },
  { value: "semi_arid", label: "Semi-Arid", desc: "Low rainfall — dry" },
  { value: "sub_humid", label: "Sub-Humid", desc: "Moderate rainfall" },
  { value: "arid",      label: "Arid",      desc: "Very dry — low water" },
] as const;

export type AgroRegion = (typeof REGIONS)[number]["value"];

export function hasConfirmedCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  return latitude != null && longitude != null
    && Number.isFinite(latitude) && Number.isFinite(longitude);
}

export function coordsForRegion(region: string): { lat: number; lon: number; label: string } {
  return REGION_DEFAULTS[region] ?? REGION_DEFAULTS.highland;
}

export function formatCoords(lat: number, lon: number, digits = 4): string {
  return `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`;
}

export function osmEmbedUrl(lat: number, lon: number, zoom = 11): string {
  const d = 0.08;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
}

export function osmViewUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`;
}

/** Browser GPS — returns null on deny / timeout / unsupported. */
export function getBrowserLocation(timeoutMs = 10000): Promise<{
  lat: number;
  lon: number;
  accuracyM: number | null;
} | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? null,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}
