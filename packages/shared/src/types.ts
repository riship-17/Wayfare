import type {
  CostTiming,
  EidStatus,
  GroupKind,
  HousingNeed,
  Requirement,
  Role,
  RoomType,
  TransitMode,
  VerificationStatus,
} from './enums';
import type { Journey, OfficialLink, TaskTemplateLike } from './journey';
import type { RatesSnapshot } from './currency';

export interface SourceRef {
  label: string;
  url: string;
  checkedOn: string;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  institutionId: string | null;
  homeCountry: string | null;
  homeCurrency: string;
  arrivalDate: string | null;
  housingNeed: HousingNeed | null;
  eidStatus: EidStatus;
  eidStatusUpdatedAt: string | null;
  savedListingIds: string[];
  chosenListingId: string | null;
  language: 'en';
  isDemo: boolean;
  onboarded: boolean;
}

export interface ApiInstitution {
  id: string;
  name: string;
  slug: string;
  area: string;
  location: { lat: number; lng: number } | null;
  nearestTransit: { stationId: string; mode: TransitMode; note: string }[];
  website: string;
  verified: boolean;
}

export interface ApiRoomType {
  type: RoomType;
  priceAedMonthly: number | null;
  depositAed: number | null;
}

export interface ApiListing {
  id: string;
  institutionIds: string[];
  providerName: string;
  title: string;
  area: string;
  location: { lat: number; lng: number } | null;
  roomTypes: ApiRoomType[];
  billsIncluded: string[];
  amenities: string[];
  houseRules: string[];
  womenOnly: boolean;
  photos: { url: string; alt: string; credit: string }[];
  contact: { website: string | null; phone: string | null };
  transit: { stationId: string; stationName: string; lineName: string; mode: TransitMode; walkMinutesApprox: number } | null;
  campusDistanceKm: number | null;
  verification: {
    status: VerificationStatus;
    verifiedByName: string | null;
    verifiedAt: string | null;
    sourceUrl: string | null;
    checkedOn: string | null;
    notes: string | null;
  };
  source: SourceRef | null;
}

export interface ApiJourney extends Journey {
  templates: TaskTemplateLike[];
  eidStatus: EidStatus;
  arrivalDate: string;
}

export interface ApiServiceGuide {
  key: string;
  title: string;
  summary: string;
  dayZeroReady: boolean;
  needs: Requirement[];
  steps: string[];
  bridge: string | null;
  links: OfficialLink[];
  source: SourceRef;
  icon: string;
}

export interface ApiCostItem {
  key: string;
  label: string;
  timing: CostTiming;
  amountAed: number | null;
  amountNote: string | null;
  needsEmiratesId: boolean;
  fromListing: 'rent' | 'deposit' | null;
  source: SourceRef | null;
}

export interface ApiBudget {
  items: { key: string; amountAed: number | null }[];
  homeCurrency: string;
  shareToken: string | null;
  shareActive: boolean;
}

export interface ApiEvent {
  id: string;
  institutionId: string;
  title: string;
  startsAt: string;
  place: string;
  description: string;
  rsvpCount: number;
  going: boolean;
}

export interface ApiGroupPost {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  reported: boolean;
  official: boolean;
}

export interface ApiGroup {
  id: string;
  institutionId: string;
  name: string;
  kind: GroupKind;
  description: string;
  memberCount: number;
  joined: boolean;
  requiresDomain: string | null;
  posts: ApiGroupPost[];
}

export interface ApiBrokerReport {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  contact: string;
  description: string;
  status: 'new' | 'handled';
  createdAt: string;
}

export interface ApiShareView {
  studentFirstName: string;
  homeCurrency: string;
  arrivalDate: string | null;
  institutionName: string | null;
  costs: ApiCostItem[];
  items: { key: string; amountAed: number | null }[];
  listing: ApiListing | null;
  rates: RatesSnapshot | null;
  dayZero: { key: string; title: string; phase: string }[];
}

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}
