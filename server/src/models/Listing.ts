import { Schema, model } from 'mongoose';
import { ROOM_TYPES, VERIFICATION_STATUSES } from '@wayfare/shared';
import { pointSchema, sourceSchema } from './common';

const listingSchema = new Schema(
  {
    institutionIds: [{ type: Schema.Types.ObjectId, ref: 'Institution', index: true }],
    providerName: { type: String, required: true },
    title: { type: String, required: true },
    area: { type: String, required: true },
    location: { type: pointSchema, default: null },
    roomTypes: [
      {
        type: { type: String, enum: ROOM_TYPES, required: true },
        priceAedMonthly: { type: Number, default: null },
        depositAed: { type: Number, default: null },
        _id: false,
      },
    ],
    billsIncluded: [String],
    amenities: [String],
    houseRules: [String],
    womenOnly: { type: Boolean, default: false },
    photos: [{ url: String, alt: String, credit: String, _id: false }],
    contact: { website: { type: String, default: null }, phone: { type: String, default: null } },
    transit: {
      type: new Schema({ stationId: String, walkMinutesApprox: Number }, { _id: false }),
      default: null,
    },
    campusDistanceKm: { type: Number, default: null },
    verification: {
      status: { type: String, enum: VERIFICATION_STATUSES, default: 'pending', index: true },
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      verifiedAt: { type: Date, default: null },
      sourceUrl: { type: String, default: null },
      checkedOn: { type: String, default: null },
      notes: { type: String, default: null },
    },
    /** Where we learned this provider exists (not a verification). */
    source: { type: sourceSchema, default: null },
  },
  { timestamps: true },
);
listingSchema.index({ location: '2dsphere' }, { sparse: true });

export const Listing = model('Listing', listingSchema);
