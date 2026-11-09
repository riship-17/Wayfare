import { Schema, model } from 'mongoose';

const budgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{ key: String, amountAed: { type: Number, default: null }, _id: false }],
    homeCurrency: { type: String, default: 'AED' },
    shareToken: { type: String, default: null },
    shareRevokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Unique only for real tokens. A sparse index would still collide on explicit nulls.
budgetSchema.index({ shareToken: 1 }, { unique: true, partialFilterExpression: { shareToken: { $type: 'string' } }, name: 'shareToken_unique' });

export const Budget = model('Budget', budgetSchema);
