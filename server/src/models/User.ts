import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { EID_STATUSES, HOUSING_NEEDS, ROLES } from '@wayfare/shared';

/** Never store passport or Emirates ID numbers here. */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'student' },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', default: null },
    homeCountry: { type: String, default: null },
    homeCurrency: { type: String, default: 'AED' },
    /** Date only, stored as UTC midnight */
    arrivalDate: { type: Date, default: null },
    housingNeed: { type: String, enum: [...HOUSING_NEEDS, null], default: null },
    eidStatus: { type: String, enum: EID_STATUSES, default: 'not_started' },
    eidStatusUpdatedAt: { type: Date, default: null },
    savedListingIds: [{ type: Schema.Types.ObjectId, ref: 'Listing' }],
    chosenListingId: { type: Schema.Types.ObjectId, ref: 'Listing', default: null },
    language: { type: String, enum: ['en'], default: 'en' },
    onboarded: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
