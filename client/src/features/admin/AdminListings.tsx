import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { Plus, ShieldCheck, Trash, X } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ROOM_TYPES, ROOM_TYPE_LABELS, dubaiDateString, verificationSchema, type ApiListing, type RoomType, type TransitNetwork, type VerificationStatus } from '@wayfare/shared';
import { VerifiedBadge } from '@/components/brand/Badges';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { get, patch, RequestError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatAed } from '@/lib/currency';
import { useNetwork } from '@/lib/queries';
import { AdminTitle, useOverview } from './AdminLayout';

type AdminListing = ApiListing & { viewingRequests: number };
const STATUSES: VerificationStatus[] = ['pending', 'verified', 'rejected'];

function VerifyForm({ listing, network, onDone }: { listing: AdminListing; network?: TransitNetwork; onDone: () => void }) {
  const qc = useQueryClient();
  const [rooms, setRooms] = useState(
    listing.roomTypes.map((r) => ({ type: r.type, price: r.priceAedMonthly?.toString() ?? '', deposit: r.depositAed?.toString() ?? '' })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (body: unknown) => patch<{ listing: ApiListing }>(`/admin/listings/${listing.id}/verification`, body),
    onSuccess: async (_d, body) => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast((body as { status: string }).status === 'verified' ? `${listing.title} is verified. Students see the badge on their next refresh.` : `${listing.title} updated.`);
      onDone();
    },
    onError: (e) => (e instanceof RequestError && Object.keys(e.fields).length ? setErrors(e.fields) : toast.error(e instanceof Error ? e.message : 'Could not save.')),
  });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body = {
      status: 'verified' as const,
      roomTypes: rooms.map((r) => ({ type: r.type, priceAedMonthly: r.price === '' ? NaN : Number(r.price), depositAed: r.deposit === '' ? NaN : Number(r.deposit) })),
      sourceUrl: f.sourceUrl,
      checkedOn: f.checkedOn,
      notes: f.notes || undefined,
      area: f.area && f.area !== listing.area ? f.area : undefined,
      transit: f.stationId ? { stationId: f.stationId, walkMinutesApprox: Number(f.walk) } : listing.transit ? null : undefined,
      campusDistanceKm: f.campus ? Number(f.campus) : undefined,
    };
    const parsed = verificationSchema.safeParse(body);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[i.path.join('.')] ??= i.path.includes('priceAedMonthly') ? 'Enter the monthly price' : i.path.includes('depositAed') ? 'Enter the deposit, or 0' : i.message;
      return setErrors(out);
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  const stations = network ? [...network.stations].sort((a, b) => a.name.localeCompare(b.name)) : [];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-3xl bg-cornflower-wash p-6" aria-label={`Verify ${listing.title}`}>
      <p className="type-body-sm">Verifying shows the Verified badge and prices to students. Every field here must come from the provider's own price list or contract.</p>
      <fieldset className="flex flex-col gap-4">
        <legend className="type-title mb-2">Price per room type</legend>
        {rooms.map((r, i) => (
          <div key={i} className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Select label="Room type" value={r.type} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, type: e.target.value as RoomType } : x)))}>
              {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
            </Select>
            <Input label="AED a month" type="number" inputMode="decimal" min={0} value={r.price} error={errors[`roomTypes.${i}.priceAedMonthly`]} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
            <Input label="Deposit AED" type="number" inputMode="decimal" min={0} value={r.deposit} error={errors[`roomTypes.${i}.depositAed`]} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, deposit: e.target.value } : x)))} />
            <button type="button" className="tap mt-8 inline-flex size-11 items-center justify-center rounded-full hover:bg-white disabled:opacity-40" aria-label={`Remove ${ROOM_TYPE_LABELS[r.type]}`} disabled={rooms.length === 1} onClick={() => setRooms(rooms.filter((_, j) => j !== i))}>
              <Trash size={20} weight="bold" aria-hidden />
            </button>
          </div>
        ))}
        {errors.roomTypes && <p className="type-body-sm text-alert" role="alert">{errors.roomTypes}</p>}
        <Button type="button" variant="ghost" className="self-start" onClick={() => setRooms([...rooms, { type: 'private', price: '', deposit: '' }])}>
          <Plus size={16} weight="bold" aria-hidden />
          Add a room type
        </Button>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input name="sourceUrl" type="url" label="Source link" placeholder="https://" hint="The provider's price list or your signed agreement" error={errors.sourceUrl} defaultValue={listing.verification.sourceUrl ?? ''} />
        <Input name="checkedOn" type="date" label="Checked on" error={errors.checkedOn} defaultValue={listing.verification.checkedOn ?? dubaiDateString()} />
      </div>
      <fieldset className="flex flex-col gap-4">
        <legend className="type-title mb-2">Location, from the provider's published address</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input name="area" label="Area" defaultValue={listing.area.startsWith('Area to confirm') ? '' : listing.area} hint="Leave empty if unknown" />
          <Select name="stationId" label="Nearest station" defaultValue={listing.transit?.stationId ?? ''} error={errors['transit.stationId']}>
            <option value="">Unknown, hide the transit chip</option>
            {stations.map((s) => <option key={s.stationId} value={s.stationId}>{s.name} ({s.mode})</option>)}
          </Select>
          <Input name="walk" type="number" min={1} max={60} label="Walk, minutes" defaultValue={listing.transit?.walkMinutesApprox ?? ''} error={errors['transit.walkMinutesApprox']} />
        </div>
        <Input name="campus" type="number" step="0.1" min={0} label="Distance to campus, km" defaultValue={listing.campusDistanceKm ?? ''} />
      </fieldset>
      <Textarea name="notes" label="Notes for other staff" rows={2} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={save.isPending} loadingLabel="Verifying" data-testid="verify-submit">
          <ShieldCheck size={20} weight="bold" aria-hidden />
          Verify listing
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function RejectForm({ listing, onDone }: { listing: AdminListing; onDone: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const save = useMutation({
    mutationFn: (notes: string) => patch(`/admin/listings/${listing.id}/verification`, { status: 'rejected', notes }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast(`${listing.title} rejected. Students no longer see it.`);
      onDone();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save.'),
  });
  return (
    <form
      className="flex flex-col gap-4 rounded-3xl border-[2.5px] border-alert p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const notes = String(new FormData(e.currentTarget).get('notes') ?? '').trim();
        if (!notes) return setError('Say why it was rejected');
        save.mutate(notes);
      }}
    >
      <Textarea name="notes" label="Why is it rejected?" error={error} rows={2} />
      <div className="flex gap-3">
        <Button type="submit" variant="danger" loading={save.isPending} loadingLabel="Rejecting">Reject listing</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function AdminListings() {
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [open, setOpen] = useState<{ id: string; mode: 'verify' | 'reject' } | null>(null);
  const qc = useQueryClient();
  const overview = useOverview();
  const network = useNetwork();
  const q = useQuery({ queryKey: ['admin', 'listings', status], queryFn: async () => (await get<{ listings: AdminListing[] }>(`/admin/listings?status=${status}`)).listings });
  const reopen = useMutation({
    mutationFn: (id: string) => patch(`/admin/listings/${id}/verification`, { status: 'pending' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
  const counts = overview.data?.counts;

  return (
    <>
      <AdminTitle title="Listings" sub="Verify places before students see prices. Pending places show as Not verified yet with Ask for price." />
      <Tabs.Root value={status} onValueChange={(v) => setStatus(v as VerificationStatus)} className="flex flex-col gap-6">
        <Tabs.List aria-label="Verification status" className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Tabs.Trigger key={s} value={s} className={cn('tap inline-flex min-h-11 items-center gap-2 rounded-full border-[2.5px] border-ink px-4 type-button-sm capitalize', status === s ? 'bg-ink text-white' : 'bg-white hover:bg-cornflower-wash')}>
              {s}
              {counts && <span className="tabular-nums">{counts[s]}</span>}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value={status} className="outline-none">
          {q.isPending ? (
            <LoadingList count={3} />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : q.data.length === 0 ? (
            <EmptyState title={`No ${status} listings.`} body={status === 'pending' ? 'New providers appear here for your housing office to check.' : undefined} />
          ) : (
            <ul className="flex flex-col gap-4">
              {q.data.map((l) => (
                <li key={l.id}>
                  <Card className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h2 className="type-heading-3">{l.title}</h2>
                        <p className="type-body-sm text-ink-muted">{l.providerName} · {l.area}</p>
                        <VerifiedBadge verified={l.verification.status === 'verified'} institution={l.verification.verifiedByName} className="mt-2 self-start" />
                      </div>
                      <div className="flex flex-col items-end gap-1 text-end">
                        <p className="type-caption text-ink-muted">{l.viewingRequests} viewing {l.viewingRequests === 1 ? 'request' : 'requests'}</p>
                        {l.source && <a href={l.source.url} target="_blank" rel="noreferrer" className="type-caption underline underline-offset-2">Where we found it</a>}
                      </div>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {l.roomTypes.map((r) => (
                        <li key={r.type} className="rounded-full border-2 border-ink px-3 py-1 type-caption-strong">
                          {ROOM_TYPE_LABELS[r.type]}: {r.priceAedMonthly !== null ? `${formatAed(r.priceAedMonthly)} a month` : 'price not set'}
                          {r.depositAed !== null ? `, deposit ${formatAed(r.depositAed)}` : ''}
                        </li>
                      ))}
                    </ul>
                    {l.verification.notes && <p className="type-body-sm">Notes: {l.verification.notes}</p>}
                    {l.verification.status === 'verified' && l.verification.sourceUrl && (
                      <p className="type-caption text-ink-muted">Source <a className="underline" href={l.verification.sourceUrl} target="_blank" rel="noreferrer">{l.verification.sourceUrl}</a> · checked on {l.verification.checkedOn}</p>
                    )}
                    {open?.id === l.id ? (
                      open.mode === 'verify' ? <VerifyForm listing={l} network={network.data} onDone={() => setOpen(null)} /> : <RejectForm listing={l} onDone={() => setOpen(null)} />
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {l.verification.status !== 'verified' && (
                          <Button size="md" onClick={() => setOpen({ id: l.id, mode: 'verify' })} data-testid={`verify-${l.id}`}>
                            <ShieldCheck size={20} weight="bold" aria-hidden />
                            Verify
                          </Button>
                        )}
                        {l.verification.status === 'verified' && (
                          <Button size="md" variant="secondary" onClick={() => setOpen({ id: l.id, mode: 'verify' })}>Update prices</Button>
                        )}
                        {l.verification.status !== 'rejected' ? (
                          <Button size="md" variant="secondary" onClick={() => setOpen({ id: l.id, mode: 'reject' })}>
                            <X size={20} weight="bold" aria-hidden />
                            Reject
                          </Button>
                        ) : (
                          <Button size="md" variant="secondary" loading={reopen.isPending} onClick={() => reopen.mutate(l.id)}>Move back to pending</Button>
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}
