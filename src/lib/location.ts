export type Place = { text: string; lat?: number; lng?: number };

function validCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/**
 * Finds coordinates in a pasted location: a WhatsApp / Google Maps link
 * (…?q=4.05,9.7 · …/@4.05,9.7,17z · …!3d4.05!4d9.7) or plain "4.05, 9.7".
 * Returns null when there are none (e.g. a short maps.app.goo.gl link): the text is then kept as the address.
 */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const text = decodeURIComponent(input.trim());
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination|daddr)=(?:loc:)?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)$/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (validCoordinates(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/** Google Maps link that opens navigation to a place. */
export function navigationUrl(place: Place): string {
  if (place.lat !== undefined && place.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.text)}`;
}

/** First part of an address, used as the "area" on public pages, e.g. "Akwa, near Total station" → "Akwa". */
export function areaName(text: string): string {
  return text.split(/[,\n·-]/)[0].trim().slice(0, 40);
}
