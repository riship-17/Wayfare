import { Schema, model } from 'mongoose';
import { TRANSIT_MODES } from '@wayfare/shared';
import { pointSchema } from './common';

const stationSchema = new Schema({
  stationId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nameAr: { type: String, default: null },
  mode: { type: String, enum: TRANSIT_MODES, required: true },
  lineIds: [String],
  location: { type: pointSchema, required: true },
  zone: { type: String, default: null },
});
stationSchema.index({ location: '2dsphere' });

const lineSchema = new Schema({
  lineId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mode: { type: String, enum: TRANSIT_MODES, required: true },
  color: { type: String, required: true },
  stationIds: [String],
});

const metaSchema = new Schema({
  _id: { type: String, default: 'network' },
  version: String,
  transfers: [{ from: String, to: String, walkMinutes: Number, _id: false }],
  source: { label: String, url: String, license: String, fetchedOn: String },
});

export const TransitStation = model('TransitStation', stationSchema);
export const TransitLine = model('TransitLine', lineSchema);
export const TransitMeta = model('TransitMeta', metaSchema);
