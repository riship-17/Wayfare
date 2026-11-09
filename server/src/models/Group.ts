import { Schema, model } from 'mongoose';
import { GROUP_KINDS } from '@wayfare/shared';

const postSchema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  official: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() },
  reported: { type: Boolean, default: false },
  reportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

const groupSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, required: true },
    kind: { type: String, enum: GROUP_KINDS, required: true },
    description: { type: String, default: '' },
    /** For home country groups */
    country: { type: String, default: null },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    posts: [postSchema],
  },
  { timestamps: true },
);

export const Group = model('Group', groupSchema);
