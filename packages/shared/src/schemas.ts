import { z } from 'zod';
import {
  COST_TIMINGS,
  EID_STATUSES,
  HOUSING_NEEDS,
  PHASES,
  REQUIREMENTS,
  ROOM_TYPES,
  TASK_STATUSES,
  VERIFICATION_STATUSES,
} from './enums';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-21');
const currency = z.string().regex(/^[A-Z]{3}$/, 'Use a three letter currency code');
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Not a valid id');
const httpsUrl = z.url({ protocol: /^https?$/, message: 'Use a full link starting with https://' });

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your first name').max(80),
  email: z.email('Enter a valid email address').transform((v) => v.toLowerCase()),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Enter your password').max(200),
});

export const demoLoginSchema = z.object({ as: z.enum(['student', 'admin']) });

export const patchMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    institutionId: objectId,
    homeCountry: z.string().trim().min(2).max(60),
    homeCurrency: currency,
    arrivalDate: dateOnly,
    housingNeed: z.enum(HOUSING_NEEDS),
    language: z.enum(['en']),
    chosenListingId: objectId.nullable(),
    onboarded: z.boolean(),
  })
  .partial();

export const eidStatusSchema = z.object({ status: z.enum(EID_STATUSES) });

export const taskUpdateSchema = z.object({ status: z.enum(TASK_STATUSES) });

export const listingQuerySchema = z.object({
  institution: z.string().optional(),
  maxPriceAed: z.coerce.number().positive().optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  nearTransit: z.enum(['true', 'false']).optional(),
  womenOnly: z.enum(['true', 'false']).optional(),
  billsIncluded: z.enum(['true', 'false']).optional(),
  status: z.enum(VERIFICATION_STATUSES).optional(),
  sort: z.enum(['price', 'transit', 'campus']).optional(),
});

export const viewingRequestSchema = z.object({
  preferredDate: dateOnly.optional(),
  message: z.string().trim().max(500).optional(),
});

export const verificationSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('verified'),
    roomTypes: z
      .array(
        z.object({
          type: z.enum(ROOM_TYPES),
          priceAedMonthly: z.number().positive('Enter the monthly price'),
          depositAed: z.number().nonnegative('Enter the deposit, or 0 if there is none'),
        }),
      )
      .min(1, 'Add at least one room type with its price'),
    sourceUrl: httpsUrl,
    checkedOn: dateOnly,
    notes: z.string().trim().max(500).optional(),
    /** From the provider's published address. Leave out when the address is unknown. */
    transit: z
      .object({ stationId: z.string().min(1), walkMinutesApprox: z.number().int().min(1).max(60) })
      .nullable()
      .optional(),
    campusDistanceKm: z.number().min(0).max(80).nullable().optional(),
    area: z.string().trim().min(2).max(80).optional(),
  }),
  z.object({ status: z.literal('rejected'), notes: z.string().trim().min(1, 'Say why it was rejected').max(500) }),
  z.object({ status: z.literal('pending'), notes: z.string().trim().max(500).optional() }),
]);

export const budgetPutSchema = z.object({
  items: z
    .array(z.object({ key: z.string().min(1).max(60), amountAed: z.number().nonnegative().nullable() }))
    .max(50),
});

export const brokerReportSchema = z.object({
  listingId: objectId.optional(),
  contact: z.string().trim().min(2, 'Add a name, phone or link so we can check it').max(200),
  description: z.string().trim().min(10, 'Tell us a little more, at least 10 characters').max(2000),
});

export const brokerReportPatchSchema = z.object({ status: z.enum(['new', 'handled']) });

export const eventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  startsAt: z.iso.datetime({ offset: true, message: 'Pick a date and time' }),
  place: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(''),
});

export const taskTemplateSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes'),
  phase: z.enum(PHASES),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(600).default(''),
  steps: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  requires: z.array(z.enum(REQUIREMENTS)).default([]),
  bridge: z.string().trim().max(300).nullable().optional(),
  where: z.string().trim().max(300).nullable().optional(),
  costNote: z.string().trim().max(200).nullable().optional(),
  officialLinks: z.array(z.object({ label: z.string().trim().min(1).max(80), url: httpsUrl })).max(10).default([]),
  order: z.number().int().min(0).max(999).default(50),
});

export const taskTemplatePatchSchema = taskTemplateSchema.partial().omit({ key: true });

export const postSchema = z.object({ body: z.string().trim().min(1).max(1000) });

export const joinGroupSchema = z.object({ email: z.email('Enter your university email').optional() });

export const costTimingSchema = z.enum(COST_TIMINGS);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PatchMeInput = z.infer<typeof patchMeSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;
export type BudgetPutInput = z.infer<typeof budgetPutSchema>;
export type BrokerReportInput = z.infer<typeof brokerReportSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type TaskTemplateInput = z.infer<typeof taskTemplateSchema>;
