export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates haversine distance between two points in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Extracts coordinates from Google Maps URLs or raw "lat, lng" strings.
 * Priority hierarchy:
 * 1. !3d<lat>!4d<lng> (destination pin marker coordinate - preferred over camera viewport)
 * 2. ?q=<lat>,<lng> or &query= or ll=
 * 3. @<lat>,<lng> (viewport / camera center coordinate)
 * 4. Raw comma-separated "lat, lng"
 */
export function parseGoogleMapsUrl(input: string): Coordinates | null {
  if (!input || typeof input !== "string") return null;

  let trimmed = input.trim();

  // Handle google.com/url?q=... redirect wrapper unnesting
  if (/google\.[a-z.]+\/url\?/i.test(trimmed)) {
    try {
      const qMatch = trimmed.match(/[?&](?:q|url)=([^&]+)/);
      if (qMatch && qMatch[1]) {
        trimmed = decodeURIComponent(qMatch[1]).trim();
      }
    } catch {
      // Fall through to regular regex parsing
    }
  }

  // Priority 1: Modern Google Maps destination pin (!3d<lat>!4d<lng>)
  // Matches !3d9.591600!4d76.522200
  const pinMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
  if (pinMatch) {
    const lat = parseFloat(pinMatch[1]);
    const lng = parseFloat(pinMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Priority 2: Query params ?q=lat,lng or query=lat,lng or ll=lat,lng
  const qMatch = trimmed.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Priority 3: Viewport camera fallback @lat,lng
  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Priority 4: Plain comma-separated coordinates "9.5916, 76.5222"
  const rawMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}
