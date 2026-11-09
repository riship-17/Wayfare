import { Schema, model } from 'mongoose';
import { COST_TIMINGS } from '@wayfare/shared';
import { sourceSchema } from './common';

const costItemSchema = new Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  timing: { type: String, enum: COST_TIMINGS, required: true },
  amountAed: { type: Number, default: null },
  amountNote: { type: String, default: null },
  needsEmiratesId: { type: Boolean, default: false },
  fromListing: { type: String, enum: ['rent', 'deposit', null], default: null },
  source: { type: sourceSchema, default: null },
  order: { type: Number, default: 50 },
});

export const CostItem = model('CostItem', costItemSchema);
