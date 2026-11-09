import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  buildJourney,
  type ApiBudget,
  type ApiCostItem,
  type ApiEvent,
  type ApiGroup,
  type ApiInstitution,
  type ApiJourney,
  type ApiListing,
  type ApiServiceGuide,
  type ApiUser,
  type EidStatus,
  type PatchMeInput,
  type RatesSnapshot,
  type TaskStatus,
  type TransitNetwork,
} from '@wayfare/shared';
import { del, get, patch, post, put, RequestError } from './api';
import { clearUserData, readKv, saveKv } from './db';
import { queueTask } from './offline';

export const keys = {
  me: ['me'] as const,
  journey: ['journey'] as const,
  listings: (f: object) => ['listings', f] as const,
  listing: (id: string) => ['listing', id] as const,
  rates: ['rates'] as const,
  costs: ['costs'] as const,
  budget: ['budget'] as const,
  essentials: ['essentials'] as const,
  network: ['network'] as const,
  institutions: ['institutions'] as const,
  events: ['events'] as const,
  groups: ['groups'] as const,
};

/** Wraps a fetch so a successful result is mirrored to IndexedDB and an offline failure reads the mirror. */
async function withMirror<T>(kvKey: string, fetcher: () => Promise<T>): Promise<T & { _savedAt?: string }> {
  try {
    const value = await fetcher();
    void saveKv(kvKey, value);
    return value as T & { _savedAt?: string };
  } catch (err) {
    if (err instanceof RequestError && (err.offline || err.status >= 500)) {
      const saved = await readKv<T>(kvKey);
      if (saved) return { ...(saved.value as object), _savedAt: saved.savedAt } as T & { _savedAt?: string };
    }
    throw err;
  }
}

// ---------------------------------------------------------------- session
export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => withMirror('me', () => get<{ user: ApiUser | null; demoMode: boolean }>('/auth/me')),
    staleTime: 60_000,
  });
}

export function useDemoLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (as: 'student' | 'admin') => post<{ user: ApiUser }>('/auth/demo', { as }),
    onSuccess: async (data) => {
      await clearUserData();
      qc.clear();
      qc.setQueryData(keys.me, { user: data.user, demoMode: true });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/auth/logout'),
    onSuccess: async () => {
      await clearUserData();
      qc.clear();
      qc.setQueryData(keys.me, { user: null, demoMode: false });
    },
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatchMeInput) => patch<{ user: ApiUser }>('/me', input),
    onSuccess: (data) => {
      qc.setQueryData(keys.me, (old: { demoMode: boolean } | undefined) => ({ demoMode: old?.demoMode ?? false, user: data.user }));
      void qc.invalidateQueries({ queryKey: keys.journey });
      void qc.invalidateQueries({ queryKey: keys.budget });
      void qc.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useEidStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: EidStatus) => patch<{ user: ApiUser; unlocked: string[] }>('/me/eid-status', { status }),
    onSuccess: (data) => {
      qc.setQueryData(keys.me, (old: { demoMode: boolean } | undefined) => ({ demoMode: old?.demoMode ?? false, user: data.user }));
      void qc.invalidateQueries({ queryKey: keys.journey });
    },
  });
}

export function useDemoControls() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { arrivalOffsetDays?: number; eidStatus?: EidStatus; reset?: boolean }) =>
      post<{ user: ApiUser; unlocked: string[]; journey: ApiJourney }>('/me/demo-controls', input),
    onSuccess: (data) => {
      qc.setQueryData(keys.me, (old: { demoMode: boolean } | undefined) => ({ demoMode: old?.demoMode ?? true, user: data.user }));
      qc.setQueryData(keys.journey, data.journey);
      void saveKv('journey', data.journey);
      void qc.invalidateQueries({ queryKey: keys.budget });
      void qc.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

// ---------------------------------------------------------------- journey
export function useJourney(enabled = true) {
  return useQuery({
    queryKey: keys.journey,
    queryFn: () => withMirror('journey', () => get<ApiJourney>('/journey')),
    enabled,
  });
}

/** Recomputes the journey on the device with the shared Day Zero logic, so ticking works offline. */
export function applyTaskLocally(j: ApiJourney, key: string, status: TaskStatus): ApiJourney {
  const taskStatuses = Object.fromEntries(j.tasks.map((t) => [t.key, t.status])) as Record<string, TaskStatus>;
  taskStatuses[key] = status;
  const next = buildJourney(j.templates, { arrivalDate: j.arrivalDate, eidStatus: j.eidStatus, taskStatuses });
  return { ...j, ...next };
}

export function useSetTask() {
  const qc = useQueryClient();
  return useMutation({
    // Run even when offline: the mutation itself writes to the IndexedDB outbox instead of pausing in memory.
    networkMode: 'always',
    mutationFn: async ({ key, status }: { key: string; status: TaskStatus }) => {
      if (!navigator.onLine) {
        await queueTask(key, status);
        return { queued: true as const };
      }
      try {
        const j = await patch<ApiJourney>(`/journey/tasks/${encodeURIComponent(key)}`, { status });
        return { queued: false as const, journey: j };
      } catch (err) {
        if (err instanceof RequestError && err.offline) {
          await queueTask(key, status);
          return { queued: true as const };
        }
        throw err;
      }
    },
    onMutate: async ({ key, status }) => {
      await qc.cancelQueries({ queryKey: keys.journey });
      const prev = qc.getQueryData<ApiJourney>(keys.journey);
      if (prev) {
        const next = applyTaskLocally(prev, key, status);
        qc.setQueryData(keys.journey, next);
        void saveKv('journey', next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.journey, ctx.prev);
    },
    onSuccess: (res) => {
      if (!res.queued) {
        qc.setQueryData(keys.journey, res.journey);
        void saveKv('journey', res.journey);
      }
    },
  });
}

// ---------------------------------------------------------------- housing
export interface ListingFilters {
  maxPriceAed?: number;
  roomType?: string;
  nearTransit?: boolean;
  womenOnly?: boolean;
  billsIncluded?: boolean;
  sort?: 'price' | 'transit' | 'campus';
}

function qs(f: ListingFilters) {
  const p = new URLSearchParams();
  if (f.maxPriceAed) p.set('maxPriceAed', String(Math.round(f.maxPriceAed)));
  if (f.roomType) p.set('roomType', f.roomType);
  if (f.nearTransit) p.set('nearTransit', 'true');
  if (f.womenOnly) p.set('womenOnly', 'true');
  if (f.billsIncluded) p.set('billsIncluded', 'true');
  if (f.sort) p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function useListings(filters: ListingFilters) {
  const q = qs(filters);
  return useQuery({
    queryKey: keys.listings(filters),
    queryFn: () => withMirror(`listings${q}`, () => get<{ listings: ApiListing[] }>(`/listings${q}`)),
  });
}

export function useListing(id: string, seed?: () => ApiListing | undefined) {
  return useQuery({
    queryKey: keys.listing(id),
    queryFn: () => withMirror(`listing:${id}`, () => get<{ listing: ApiListing }>(`/listings/${id}`)),
    enabled: !!id,
    initialData: () => {
      const l = seed?.();
      return l ? { listing: l } : undefined;
    },
    initialDataUpdatedAt: 0,
  });
}

export function findCachedListing(qc: QueryClient, id: string): ApiListing | undefined {
  for (const [, data] of qc.getQueriesData<{ listings: ApiListing[] }>({ queryKey: ['listings'] })) {
    const hit = data?.listings?.find((l) => l.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<{ saved: boolean; user: ApiUser }>(`/me/saved-listings/${id}`),
    onSuccess: (data) => qc.setQueryData(keys.me, (old: { demoMode: boolean } | undefined) => ({ demoMode: old?.demoMode ?? false, user: data.user })),
  });
}

export function useViewingRequest(id: string) {
  return useMutation({
    mutationFn: (input: { preferredDate?: string; message?: string }) =>
      post<{ ok: true; providerName: string; alreadyRequested: boolean }>(`/listings/${id}/viewing-requests`, input),
  });
}

export function useBrokerReport() {
  return useMutation({
    mutationFn: (input: { listingId?: string; contact: string; description: string }) => post<{ id: string }>('/broker-reports', input),
  });
}

// ---------------------------------------------------------------- money
export function useRates() {
  return useQuery({
    queryKey: keys.rates,
    queryFn: async () => (await withMirror('rates', () => get<{ rates: RatesSnapshot }>('/rates'))).rates,
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

export function useCosts() {
  return useQuery({
    queryKey: keys.costs,
    queryFn: async () => (await withMirror('costs', () => get<{ costs: ApiCostItem[] }>('/costs'))).costs,
    staleTime: 60 * 60_000,
  });
}

export function useBudget(enabled = true) {
  return useQuery({
    queryKey: keys.budget,
    queryFn: async () => (await withMirror('budget', () => get<{ budget: ApiBudget }>('/budget/me'))).budget,
    enabled,
  });
}

export function useSaveBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ApiBudget['items']) => put<{ budget: ApiBudget }>('/budget/me', { items }),
    onSuccess: (d) => {
      qc.setQueryData(keys.budget, d.budget);
      void saveKv('budget', { budget: d.budget });
    },
  });
}

export function useShareBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) => (on ? post<{ budget: ApiBudget }>('/budget/share') : del<{ budget: ApiBudget }>('/budget/share')),
    onSuccess: (d) => qc.setQueryData(keys.budget, d.budget),
  });
}

// ---------------------------------------------------------------- content
/** Essentials prefer the API and fall back to the precached offline file. */
export function useEssentials() {
  return useQuery({
    queryKey: keys.essentials,
    queryFn: async () => {
      try {
        return (await get<{ services: ApiServiceGuide[] }>('/essentials')).services;
      } catch {
        const res = await fetch('/offline/essentials.json');
        if (!res.ok) throw new RequestError(0, 'offline', 'Essentials are not saved on this device yet.');
        return ((await res.json()) as { services: ApiServiceGuide[] }).services;
      }
    },
    staleTime: 60 * 60_000,
  });
}

/** The transit network ships as a precached file, so the map and route planner work with no connection. */
export function useNetwork() {
  return useQuery({
    queryKey: keys.network,
    queryFn: async () => {
      const res = await fetch('/offline/transit.json');
      if (!res.ok) throw new RequestError(res.status, 'transit_missing', 'The transit map is not saved on this device yet.');
      return (await res.json()) as TransitNetwork;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useInstitutions() {
  return useQuery({
    queryKey: keys.institutions,
    queryFn: async () => (await withMirror('institutions', () => get<{ institutions: ApiInstitution[] }>('/institutions'))).institutions,
    staleTime: 60 * 60_000,
  });
}

export function useEvents(enabled = true) {
  return useQuery({
    queryKey: keys.events,
    queryFn: async () => (await withMirror('events', () => get<{ events: ApiEvent[] }>('/events'))).events,
    enabled,
  });
}

export function useRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<{ event: ApiEvent }>(`/events/${id}/rsvp`),
    onSuccess: (d) => qc.setQueryData<ApiEvent[]>(keys.events, (old) => old?.map((e) => (e.id === d.event.id ? d.event : e))),
  });
}

export function useGroups(enabled = true) {
  return useQuery({
    queryKey: keys.groups,
    queryFn: async () => (await withMirror('groups', () => get<{ groups: ApiGroup[] }>('/groups'))).groups,
    enabled,
  });
}

function replaceGroup(qc: QueryClient, g: ApiGroup) {
  qc.setQueryData<ApiGroup[]>(keys.groups, (old) => old?.map((x) => (x.id === g.id ? g : x)));
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email?: string }) => post<{ group: ApiGroup }>(`/groups/${id}/join`, email ? { email } : {}),
    onSuccess: (d) => replaceGroup(qc, d.group),
  });
}

export function usePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => post<{ group: ApiGroup }>(`/groups/${id}/posts`, { body }),
    onSuccess: (d) => replaceGroup(qc, d.group),
  });
}

export function useReportPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, postId }: { groupId: string; postId: string }) => post(`/groups/${groupId}/posts/${postId}/report`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.groups }),
  });
}
