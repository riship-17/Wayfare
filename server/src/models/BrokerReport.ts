import { Schema, model } from 'mongoose';

const brokerReportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', default: null, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', default: null },
    contact: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['new', 'handled'], default: 'new' },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const BrokerReport = model('BrokerReport', brokerReportSchema);
