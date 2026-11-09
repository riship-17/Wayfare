import { Schema, model } from 'mongoose';

const viewingRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    preferredDate: { type: String, default: null },
    message: { type: String, default: null },
    status: { type: String, enum: ['new', 'contacted'], default: 'new' },
  },
  { timestamps: true },
);
viewingRequestSchema.index({ userId: 1, listingId: 1 });

export const ViewingRequest = model('ViewingRequest', viewingRequestSchema);
