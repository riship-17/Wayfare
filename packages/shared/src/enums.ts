export const PHASES = ['before_arrival', 'arrival', 'initial_settlement', 'adjustment'] as const;
export type Phase = (typeof PHASES)[number];

export const STAGES = ['prepare', 'arrive', 'settle'] as const;
export type Stage = (typeof STAGES)[number];

export const REQUIREMENTS = [
  'passport',
  'entry_permit',
  'enrolment_letter',
  'residence_issued',
  'emirates_id',
  'ejari',
] as const;
export type Requirement = (typeof REQUIREMENTS)[number];

/** Entered by the student. Never presented as live government tracking. */
export const EID_STATUSES = [
  'not_started',
  'entry_permit_issued',
  'arrived',
  'medical_done',
  'biometrics_done',
  'residence_issued',
  'card_received',
] as const;
export type EidStatus = (typeof EID_STATUSES)[number];

export const ROLES = ['student', 'institution_admin', 'platform_admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROOM_TYPES = ['shared', 'private', 'studio', 'ensuite'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const TASK_STATUSES = ['todo', 'done', 'skipped'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const COST_TIMINGS = ['before', 'first_month', 'monthly'] as const;
export type CostTiming = (typeof COST_TIMINGS)[number];

export const HOUSING_NEEDS = ['need_place', 'university_residence', 'sorted'] as const;
export type HousingNeed = (typeof HOUSING_NEEDS)[number];

export const GROUP_KINDS = ['university', 'home_country', 'interest'] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

export const TRANSIT_MODES = ['metro', 'tram'] as const;
export type TransitMode = (typeof TRANSIT_MODES)[number];

export const PHASE_STAGE: Record<Phase, Stage> = {
  before_arrival: 'prepare',
  arrival: 'arrive',
  initial_settlement: 'settle',
  adjustment: 'settle',
};

export const PHASE_LABELS: Record<Phase, string> = {
  before_arrival: 'Before arrival',
  arrival: 'Arrival, Day 0 to 7',
  initial_settlement: 'Initial settlement, Day 7 to 30',
  adjustment: 'Adjustment, Month 1 to 6',
};

export const STAGE_LABELS: Record<Stage, string> = {
  prepare: 'Prepare',
  arrive: 'Arrive',
  settle: 'Settle',
};

export const REQUIREMENT_LABELS: Record<Requirement, string> = {
  passport: 'Passport',
  entry_permit: 'Entry permit',
  enrolment_letter: 'Enrolment letter',
  residence_issued: 'Residence visa',
  emirates_id: 'Emirates ID',
  ejari: 'Ejari',
};

export const EID_STATUS_LABELS: Record<EidStatus, string> = {
  not_started: 'Not started',
  entry_permit_issued: 'Entry permit issued',
  arrived: 'Arrived in Dubai',
  medical_done: 'Medical test done',
  biometrics_done: 'Biometrics done',
  residence_issued: 'Residence visa issued',
  card_received: 'Emirates ID received',
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  shared: 'Shared room',
  private: 'Private room',
  studio: 'Studio',
  ensuite: 'Ensuite room',
};
