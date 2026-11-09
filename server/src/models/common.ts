import { Schema } from 'mongoose';

export const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    /** [lng, lat] */
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

export const sourceSchema = new Schema(
  { label: { type: String, required: true }, url: { type: String, required: true }, checkedOn: { type: String, required: true } },
  { _id: false },
);

export const linkSchema = new Schema({ label: { type: String, required: true }, url: { type: String, required: true } }, { _id: false });

export function toLatLng(p?: { coordinates?: number[] } | null): { lat: number; lng: number } | null {
  if (!p?.coordinates || p.coordinates.length !== 2) return null;
  return { lng: p.coordinates[0], lat: p.coordinates[1] };
}
