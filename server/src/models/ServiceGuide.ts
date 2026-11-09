import { Schema, model } from 'mongoose';
import { REQUIREMENTS } from '@wayfare/shared';
import { linkSchema, sourceSchema } from './common';

const serviceGuideSchema = new Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  icon: { type: String, default: 'info' },
  dayZeroReady: { type: Boolean, required: true },
  needs: [{ type: String, enum: REQUIREMENTS }],
  steps: [String],
  bridge: { type: String, default: null },
  links: [linkSchema],
  source: { type: sourceSchema, required: true },
  order: { type: Number, default: 50 },
});

export const ServiceGuide = model('ServiceGuide', serviceGuideSchema);
