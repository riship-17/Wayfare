import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, PencilSimple, Trash } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { eventSchema, type ApiEvent } from '@wayfare/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Field';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { del, get, post, put, RequestError } from '@/lib/api';
import { eventWhen } from '@/lib/dates';
import { AdminTitle } from './AdminLayout';

/** datetime-local value in Dubai time for an ISO date */
function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 4 * 3600_000);
  return d.toISOString().slice(0, 16);
}

function EventForm({ event, onDone }: { event?: ApiEvent; onDone: () => void }) {
  const qc = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (body: unknown) => (event ? put(`/admin/events/${event.id}`, body) : post('/admin/events', body)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast(event ? 'Event updated' : 'Event posted. Students see it on Home.');
      onDone();
    },
    onError: (e) => (e instanceof RequestError && Object.keys(e.fields).length ? setErrors(e.fields) : toast.error(e instanceof Error ? e.message : 'Could not save.')),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    // Times are entered in Dubai time (UTC+4).
    const startsAt = f.startsAt ? `${f.startsAt}:00+04:00` : '';
    const parsed = eventSchema.safeParse({ title: f.title, startsAt, place: f.place, description: f.description });
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      return setErrors(out);
    }
    save.mutate(parsed.data);
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-cornflower-wash p-6">
      <Input name="title" label="Title" defaultValue={event?.title} error={errors.title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input name="startsAt" type="datetime-local" label="Starts, Dubai time" defaultValue={toLocalInput(event?.startsAt)} error={errors.startsAt} />
        <Input name="place" label="Place" defaultValue={event?.place} error={errors.place} />
      </div>
      <Textarea name="description" label="Description" defaultValue={event?.description} rows={3} />
      <div className="flex gap-3">
        <Button type="submit" loading={save.isPending} loadingLabel="Saving">{event ? 'Save event' : 'Post event'}</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function AdminEvents() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const q = useQuery({ queryKey: ['admin', 'events'], queryFn: async () => (await get<{ events: ApiEvent[] }>('/admin/events')).events });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/admin/events/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast('Event removed');
    },
  });
  return (
    <>
      <AdminTitle title="Events" sub="Post welcome week, orientation and community events. Students see them on Home and in Community." />
      {editing === 'new' ? (
        <EventForm onDone={() => setEditing(null)} />
      ) : (
        <Button className="self-start" onClick={() => setEditing('new')}>
          <CalendarPlus size={20} weight="bold" aria-hidden />
          New event
        </Button>
      )}
      {q.isPending ? (
        <LoadingList count={2} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title="No events yet." body="Students see: No events yet. Your university posts them here." />
      ) : (
        <ul className="flex flex-col gap-4">
          {q.data.map((e) => (
            <li key={e.id}>
              {editing === e.id ? (
                <EventForm event={e} onDone={() => setEditing(null)} />
              ) : (
                <Card className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="type-heading-3">{e.title}</p>
                    <p className="type-body-sm">{eventWhen(e.startsAt)} · {e.place}</p>
                    <p className="type-caption text-ink-muted">{e.rsvpCount} going</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(e.id)}><PencilSimple size={16} weight="bold" aria-hidden />Edit</Button>
                    <Button variant="danger" size="sm" loading={remove.isPending && remove.variables === e.id} onClick={() => remove.mutate(e.id)}><Trash size={16} weight="bold" aria-hidden />Remove</Button>
                  </div>
                </Card>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
