import { Schema, model } from 'mongoose';

const eventSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    title: { type: String, required: true },
    startsAt: { type: Date, required: true },
    place: { type: String, required: true },
    description: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rsvpUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

export const Event = model('Event', eventSchema);
