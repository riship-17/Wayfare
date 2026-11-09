import type { ApiInstitution, ApiListing, ApiUser, TransitNetwork } from '@wayfare/shared';
import { toLatLng, type UserDoc } from '../models';

export function serializeUser(u: UserDoc): ApiUser {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as ApiUser['role'],
    institutionId: u.institutionId ? String(u.institutionId) : null,
    homeCountry: u.homeCountry ?? null,
    homeCurrency: u.homeCurrency,
    arrivalDate: u.arrivalDate ? u.arrivalDate.toISOString().slice(0, 10) : null,
    housingNeed: (u.housingNeed as ApiUser['housingNeed']) ?? null,
    eidStatus: u.eidStatus,
    eidStatusUpdatedAt: u.eidStatusUpdatedAt?.toISOString() ?? null,
    savedListingIds: u.savedListingIds.map(String),
    chosenListingId: u.chosenListingId ? String(u.chosenListingId) : null,
    language: 'en',
    isDemo: u.isDemo,
    onboarded: u.onboarded,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeInstitution(i: any): ApiInstitution {
  return {
    id: String(i._id),
    name: i.name,
    slug: i.slug,
    area: i.area,
    location: toLatLng(i.location),
    nearestTransit: (i.nearestTransit ?? []).map((t: { stationId: string; mode: 'metro' | 'tram'; note: string }) => ({ stationId: t.stationId, mode: t.mode, note: t.note })),
    website: i.website,
    verified: true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeListing(l: any, network: TransitNetwork | null, verifierName: string | null = null): ApiListing {
  let transit: ApiListing['transit'] = null;
  if (l.transit?.stationId && network) {
    const st = network.stations.find((s) => s.stationId === l.transit.stationId);
    if (st) {
      const line = network.lines.find((x) => st.lineIds.includes(x.lineId));
      transit = { stationId: st.stationId, stationName: st.name, lineName: line?.name ?? '', mode: st.mode, walkMinutesApprox: l.transit.walkMinutesApprox };
    }
  }
  const verified = l.verification?.status === 'verified';
  return {
    id: String(l._id),
    institutionIds: (l.institutionIds ?? []).map(String),
    providerName: l.providerName,
    title: l.title,
    area: l.area,
    location: toLatLng(l.location),
    // Prices only show once the institution has verified them.
    roomTypes: (l.roomTypes ?? []).map((r: { type: string; priceAedMonthly: number | null; depositAed: number | null }) => ({
      type: r.type,
      priceAedMonthly: verified ? r.priceAedMonthly : null,
      depositAed: verified ? r.depositAed : null,
    })),
    billsIncluded: l.billsIncluded ?? [],
    amenities: l.amenities ?? [],
    houseRules: l.houseRules ?? [],
    womenOnly: !!l.womenOnly,
    photos: l.photos ?? [],
    contact: { website: l.contact?.website ?? null, phone: l.contact?.phone ?? null },
    transit,
    campusDistanceKm: l.campusDistanceKm ?? null,
    verification: {
      status: l.verification?.status ?? 'pending',
      verifiedByName: verified ? verifierName : null,
      verifiedAt: l.verification?.verifiedAt ? new Date(l.verification.verifiedAt).toISOString() : null,
      sourceUrl: l.verification?.sourceUrl ?? null,
      checkedOn: l.verification?.checkedOn ?? null,
      notes: l.verification?.notes ?? null,
    },
    source: l.source ?? null,
  };
}
