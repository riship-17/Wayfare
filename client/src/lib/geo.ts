import { haversineKm, walkMinutes } from '@wayfare/shared';

export { haversineKm, walkMinutes };

/** Location is used on the device only, for "near me". It is never sent to the server. */
export function currentPosition(timeoutMs = 8000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
