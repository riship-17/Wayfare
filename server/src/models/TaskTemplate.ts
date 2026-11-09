import { Schema, model } from 'mongoose';
import { PHASES, REQUIREMENTS } from '@wayfare/shared';
import { linkSchema } from './common';

const taskTemplateSchema = new Schema(
  {
    key: { type: String, required: true },
    phase: { type: String, enum: PHASES, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    steps: [String],
    requires: [{ type: String, enum: REQUIREMENTS }],
    bridge: { type: String, default: null },
    where: { type: String, default: null },
    costNote: { type: String, default: null },
    officialLinks: [linkSchema],
    costItemKeys: [String],
    /** null for global templates; set when an institution overrides or adds a task */
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', default: null },
    order: { type: Number, default: 50 },
  },
  { timestamps: true },
);
taskTemplateSchema.index({ key: 1, institutionId: 1 }, { unique: true });

export const TaskTemplate = model('TaskTemplate', taskTemplateSchema);
