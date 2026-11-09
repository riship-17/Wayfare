import { Schema, model } from 'mongoose';
import { TASK_STATUSES } from '@wayfare/shared';

const userTaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    doneAt: { type: Date, default: null },
  },
  { timestamps: true },
);
userTaskSchema.index({ userId: 1, key: 1 }, { unique: true });

export const UserTask = model('UserTask', userTaskSchema);
