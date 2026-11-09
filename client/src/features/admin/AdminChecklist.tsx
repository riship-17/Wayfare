import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowCounterClockwise, PencilSimple } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { PHASES, PHASE_LABELS, REQUIREMENT_LABELS, type OfficialLink, type Phase, type Requirement } from '@wayfare/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input, Textarea } from '@/components/ui/Field';
import { LoadingList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { del, get, patch, RequestError } from '@/lib/api';
import { AdminTitle } from './AdminLayout';

interface AdminTask {
  key: string;
  phase: Phase;
  title: string;
  summary: string;
  steps: string[];
  requires: Requirement[];
  bridge: string | null;
  where: string | null;
  costNote: string | null;
  officialLinks: OfficialLink[];
  order: number;
  customised: boolean;
  institutionOnly: boolean;
}

function parseLinks(text: string): OfficialLink[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, url] = l.split('|').map((x) => x.trim());
      return { label: url ? label : label, url: url ?? label };
    });
}

function TaskForm({ task, onDone }: { task: AdminTask; onDone: () => void }) {
  const qc = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (body: unknown) => patch(`/admin/tasks/${task.key}`, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      toast('Saved. Your students see the new steps; other universities keep the original.');
      onDone();
    },
    onError: (e) => (e instanceof RequestError ? setErrors(Object.keys(e.fields).length ? e.fields : { _: e.message }) : setErrors({ _: 'Could not save.' })),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    save.mutate({
      title: f.title,
      summary: f.summary,
      steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean),
      where: f.where || null,
      bridge: f.bridge || null,
      officialLinks: parseLinks(f.links),
    });
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-cornflower-wash p-6">
      <Input name="title" label="Title" defaultValue={task.title} error={errors.title} />
      <Textarea name="summary" label="Why it matters" defaultValue={task.summary} rows={2} error={errors.summary} />
      <Textarea name="steps" label="Steps, one per line" defaultValue={task.steps.join('\n')} rows={5} error={errors.steps} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input name="where" label="Where to go" defaultValue={task.where ?? ''} />
        <Input name="bridge" label="While it is locked" defaultValue={task.bridge ?? ''} hint="Shown when the task waits for a document" />
      </div>
      <Textarea name="links" label="Official links, one per line as Label | https://link" defaultValue={task.officialLinks.map((l) => `${l.label} | ${l.url}`).join('\n')} rows={3} error={Object.entries(errors).find(([k]) => k.startsWith('officialLinks'))?.[1]} />
      {errors._ && <p role="alert" className="type-body-sm text-alert">{errors._}</p>}
      <div className="flex gap-3">
        <Button type="submit" loading={save.isPending} loadingLabel="Saving">Save for my students</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function AdminChecklist() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['admin', 'tasks'], queryFn: async () => (await get<{ tasks: AdminTask[] }>('/admin/tasks')).tasks });
  const revert = useMutation({
    mutationFn: (key: string) => del(`/admin/tasks/${key}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      toast('Back to the Wayfare default');
    },
  });
  return (
    <>
      <AdminTitle title="Checklist" sub="Edit the steps and links of each task for your students. Locks and requirements stay as they are so the Emirates ID logic keeps working." />
      {q.isPending ? (
        <LoadingList count={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        PHASES.map((phase) => (
          <section key={phase} className="flex flex-col gap-4" aria-labelledby={`ph-${phase}`}>
            <h2 id={`ph-${phase}`} className="type-heading-2">{PHASE_LABELS[phase]}</h2>
            <ul className="flex flex-col gap-3">
              {q.data
                .filter((t) => t.phase === phase)
                .sort((a, b) => a.order - b.order)
                .map((t) => (
                  <li key={t.key}>
                    {editing === t.key ? (
                      <TaskForm task={t} onDone={() => setEditing(null)} />
                    ) : (
                      <Card className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <p className="type-title">{t.title}</p>
                          <div className="flex flex-wrap gap-2">
                            {t.customised && <Chip tone="wash">Customised</Chip>}
                            {t.requires.map((r) => <Chip key={r}>{REQUIREMENT_LABELS[r]}</Chip>)}
                          </div>
                          <p className="type-body-sm text-ink-muted">{t.steps.length} steps · {t.officialLinks.length} links</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setEditing(t.key)}><PencilSimple size={16} weight="bold" aria-hidden />Edit</Button>
                          {t.customised && (
                            <Button variant="ghost" onClick={() => revert.mutate(t.key)}><ArrowCounterClockwise size={16} weight="bold" aria-hidden />Reset</Button>
                          )}
                        </div>
                      </Card>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
