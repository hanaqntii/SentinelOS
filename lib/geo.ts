export interface Coordinate {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371000;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const distanceMeters = (from: Coordinate, to: Coordinate): number => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
};
