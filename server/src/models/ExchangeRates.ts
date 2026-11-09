import { Schema, model } from 'mongoose';

const exchangeRatesSchema = new Schema({
  base: { type: String, default: 'AED' },
  rates: { type: Map, of: Number, required: true },
  fetchedAt: { type: Date, required: true },
  nextUpdateAt: { type: Date, default: null },
  provider: { type: String, required: true },
});

export const ExchangeRates = model('ExchangeRates', exchangeRatesSchema);
