/**
 * Nigerian Agricultural Geopolitical Zones and State Directory
 * Supports nationwide coverage and location-based machinery proximity matching
 */

export const NIGERIAN_STATES = [
  'Abia State',
  'Adamawa State',
  'Akwa Ibom State',
  'Anambra State',
  'Bauchi State',
  'Bayelsa State',
  'Benue State',
  'Borno State',
  'Cross River State',
  'Delta State',
  'Ebonyi State',
  'Edo State',
  'Ekiti State',
  'Enugu State',
  'FCT Abuja',
  'Gombe State',
  'Imo State',
  'Jigawa State',
  'Kaduna State',
  'Kano State',
  'Katsina State',
  'Kebbi State',
  'Kogi State',
  'Kwara State',
  'Lagos State',
  'Nasarawa State',
  'Niger State',
  'Ogun State',
  'Ondo State',
  'Osun State',
  'Oyo State',
  'Plateau State',
  'Rivers State',
  'Sokoto State',
  'Taraba State',
  'Yobe State',
  'Zamfara State',
] as const;

export type NigerianState = typeof NIGERIAN_STATES[number];

export const STATE_TO_ZONE: Record<string, string> = {
  // North-Central
  'Benue State': 'North-Central',
  'Kogi State': 'North-Central',
  'Kwara State': 'North-Central',
  'Nasarawa State': 'North-Central',
  'Niger State': 'North-Central',
  'Plateau State': 'North-Central',
  'FCT Abuja': 'North-Central',
  // North-West
  'Jigawa State': 'North-West',
  'Kaduna State': 'North-West',
  'Kano State': 'North-West',
  'Katsina State': 'North-West',
  'Kebbi State': 'North-West',
  'Sokoto State': 'North-West',
  'Zamfara State': 'North-West',
  // North-East
  'Adamawa State': 'North-East',
  'Bauchi State': 'North-East',
  'Borno State': 'North-East',
  'Gombe State': 'North-East',
  'Taraba State': 'North-East',
  'Yobe State': 'North-East',
  // South-West
  'Ekiti State': 'South-West',
  'Lagos State': 'South-West',
  'Ogun State': 'South-West',
  'Ondo State': 'South-West',
  'Osun State': 'South-West',
  'Oyo State': 'South-West',
  // South-East
  'Abia State': 'South-East',
  'Anambra State': 'South-East',
  'Ebonyi State': 'South-East',
  'Enugu State': 'South-East',
  'Imo State': 'South-East',
  // South-South
  'Akwa Ibom State': 'South-South',
  'Bayelsa State': 'South-South',
  'Cross River State': 'South-South',
  'Delta State': 'South-South',
  'Edo State': 'South-South',
  'Rivers State': 'South-South',
};

/**
 * Normalizes a location string by removing extra whitespace, state suffixes, etc.
 */
export function normalizeLocation(loc: string): string {
  if (!loc) return '';
  return loc.toLowerCase().replace(/state/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Calculates a match score (0-100) between an equipment's location and a target farm location/query.
 * Used to recommend and sort equipment closer to the inputted farm location.
 */
export function calculateLocationProximityScore(
  itemState: string,
  itemLGA: string,
  targetLocationOrState: string
): number {
  if (!targetLocationOrState || !targetLocationOrState.trim()) {
    return 50; // Neutral default
  }

  const normalizedTarget = normalizeLocation(targetLocationOrState);
  const normalizedState = normalizeLocation(itemState);
  const normalizedLGA = normalizeLocation(itemLGA);

  // Exact LGA match in target
  if (normalizedTarget.includes(normalizedLGA) || normalizedLGA.includes(normalizedTarget)) {
    return 100;
  }

  // Exact State match
  if (normalizedTarget.includes(normalizedState) || normalizedState.includes(normalizedTarget)) {
    return 80;
  }

  // Geopolitical Zone match (adjacent agricultural zone)
  const itemZone = STATE_TO_ZONE[itemState] || STATE_TO_ZONE[`${itemState} State`];
  if (itemZone) {
    for (const [stateName, zone] of Object.entries(STATE_TO_ZONE)) {
      const normState = normalizeLocation(stateName);
      if (normalizedTarget.includes(normState) && zone === itemZone) {
        return 60; // Same agricultural zone
      }
    }
  }

  return 20; // Different zone / standard pool
}

/**
 * State capital / centroid coordinates for accurate Nigerian weather and agro-climate retrieval
 */
export const STATE_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Abia State': { lat: 5.4527, lon: 7.5248 },
  'Adamawa State': { lat: 9.3265, lon: 12.3984 },
  'Akwa Ibom State': { lat: 5.0377, lon: 7.9128 },
  'Anambra State': { lat: 6.2209, lon: 7.0722 },
  'Bauchi State': { lat: 10.3158, lon: 9.8442 },
  'Bayelsa State': { lat: 4.7719, lon: 6.0699 },
  'Benue State': { lat: 7.7322, lon: 8.5214 },
  'Borno State': { lat: 11.8333, lon: 13.1500 },
  'Cross River State': { lat: 5.8702, lon: 8.5988 },
  'Delta State': { lat: 5.8904, lon: 5.6806 },
  'Ebonyi State': { lat: 6.2649, lon: 8.0137 },
  'Edo State': { lat: 6.5438, lon: 5.8987 },
  'Ekiti State': { lat: 7.6211, lon: 5.2215 },
  'Enugu State': { lat: 6.4584, lon: 7.5464 },
  'FCT Abuja': { lat: 9.0765, lon: 7.3986 },
  'Gombe State': { lat: 10.2897, lon: 11.1673 },
  'Imo State': { lat: 5.4836, lon: 7.0333 },
  'Jigawa State': { lat: 12.2280, lon: 9.5616 },
  'Kaduna State': { lat: 10.5222, lon: 7.4383 },
  'Kano State': { lat: 12.0022, lon: 8.5920 },
  'Katsina State': { lat: 12.9889, lon: 7.6006 },
  'Kebbi State': { lat: 12.4504, lon: 4.1999 },
  'Kogi State': { lat: 7.8023, lon: 6.7333 },
  'Kwara State': { lat: 8.4966, lon: 4.5421 },
  'Lagos State': { lat: 6.5244, lon: 3.3792 },
  'Nasarawa State': { lat: 8.4998, lon: 8.5153 },
  'Niger State': { lat: 9.6139, lon: 6.5569 },
  'Ogun State': { lat: 7.1475, lon: 3.3619 },
  'Ondo State': { lat: 7.2571, lon: 5.2058 },
  'Osun State': { lat: 7.5629, lon: 4.5200 },
  'Oyo State': { lat: 7.3775, lon: 3.9470 },
  'Plateau State': { lat: 9.8965, lon: 8.8583 },
  'Rivers State': { lat: 4.8156, lon: 7.0498 },
  'Sokoto State': { lat: 13.0609, lon: 5.2476 },
  'Taraba State': { lat: 8.8937, lon: 11.3601 },
  'Yobe State': { lat: 12.0000, lon: 11.5000 },
  'Zamfara State': { lat: 12.1704, lon: 6.6646 },
};

export interface GeoCoordinates { lat: number; lon: number }

import type { User } from '../types';

const geocodeCache = new Map<string, GeoCoordinates | null>();

function stateFallbackCoordinates(location: string): GeoCoordinates | null {
  const normalizedLocation = normalizeLocation(location);
  const stateName = Object.keys(STATE_COORDINATES).find(state => {
    const normalizedState = normalizeLocation(state);
    return normalizedLocation.includes(normalizedState) || normalizedState.includes(normalizedLocation);
  });
  return stateName ? STATE_COORDINATES[stateName] : null;
}

/** Uses the browser's permissioned position first, then OpenStreetMap geocoding as a fallback. */
export async function getCurrentCoordinates(fallbackLocation?: string): Promise<GeoCoordinates | null> {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    const position = await new Promise<GeolocationPosition | null>(resolve => {
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: false, timeout: 3500, maximumAge: 300000 });
    });
    if (position) return { lat: position.coords.latitude, lon: position.coords.longitude };
  }
  return fallbackLocation ? geocodeNigeriaLocation(fallbackLocation) : null;
}

/**
 * Resolves the origin used for equipment distance calculations. Farm location
 * wins for farmers and dual-role accounts; owners use their live device position.
 */
export async function getDashboardOriginCoordinates(user: Pick<User, 'role' | 'hasDualRole' | 'location' | 'lga' | 'state'>): Promise<GeoCoordinates | null> {
  const farmLocation = user.location || [user.lga, user.state].filter(Boolean).join(', ');
  if (user.role === 'farmer' || user.hasDualRole) return geocodeNigeriaLocation(farmLocation);
  return getCurrentCoordinates(farmLocation);
}

export async function geocodeNigeriaLocation(location: string): Promise<GeoCoordinates | null> {
  const query = `${location}, Nigeria`.trim();
  const key = query.toLowerCase();
  if (!key || geocodeCache.has(key)) return geocodeCache.get(key) ?? null;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Geocoding request failed');
    const results = await response.json() as Array<{ lat: string; lon: string }>;
    const result = results[0];
    const coordinates = result ? { lat: Number(result.lat), lon: Number(result.lon) } : stateFallbackCoordinates(location);
    geocodeCache.set(key, coordinates);
    return coordinates;
  } catch {
    const fallback = stateFallbackCoordinates(location);
    geocodeCache.set(key, fallback);
    return fallback;
  }
}

export function distanceBetweenCoordinates(from: GeoCoordinates, to: GeoCoordinates): number {
  const earthRadiusKm = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(to.lat - from.lat);
  const dLon = radians(to.lon - from.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
