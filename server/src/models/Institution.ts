import { Schema, model } from 'mongoose';
import { pointSchema, sourceSchema } from './common';

const institutionSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    area: { type: String, required: true },
    location: { type: pointSchema, default: null },
    emailDomains: [{ type: String }],
    nearestTransit: [{ stationId: String, mode: { type: String, enum: ['metro', 'tram'] }, note: String, _id: false }],
    website: { type: String, required: true },
    adminIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    source: { type: sourceSchema, default: null },
  },
  { timestamps: true },
);

export const Institution = model('Institution', institutionSchema);
