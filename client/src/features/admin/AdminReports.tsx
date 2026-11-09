import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Flag } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { ApiBrokerReport } from '@wayfare/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { get, patch } from '@/lib/api';
import { eventWhen } from '@/lib/dates';
import { AdminTitle } from './AdminLayout';

interface ReportedPost { groupId: string; groupName: string; postId: string; body: string; reports: number }

export function AdminReports() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => get<{ reports: ApiBrokerReport[]; reportedPosts: ReportedPost[] }>('/admin/broker-reports') });
  const mark = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'new' | 'handled' }) => patch(`/admin/broker-reports/${id}`, { status }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast('Report updated');
    },
  });
  const moderate = useMutation({
    mutationFn: (p: { groupId: string; postId: string; action: 'remove' | 'keep' }) => patch(`/admin/groups/${p.groupId}/posts/${p.postId}`, { action: p.action }),
    onSuccess: async (_d, v) => {
      await qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast(v.action === 'remove' ? 'Post removed' : 'Post kept');
    },
  });
  return (
    <>
      <AdminTitle title="Broker reports" sub="Students report brokers and listings that feel wrong. Review each one and mark it handled." />
      {q.isPending ? (
        <LoadingList count={2} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          {q.data.reports.length === 0 ? (
            <EmptyState title="No reports." body="When a student reports a broker it appears here." />
          ) : (
            <ul className="flex flex-col gap-4">
              {q.data.reports.map((r) => (
                <li key={r.id}>
                  <Card className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Flag size={20} weight="bold" aria-hidden />
                      <p className="type-title">{r.contact}</p>
                      <Chip tone={r.status === 'handled' ? 'verified' : 'prepare'}>{r.status === 'handled' ? 'Handled' : 'New'}</Chip>
                    </div>
                    <p className="type-body">{r.description}</p>
                    <p className="type-caption text-ink-muted">{eventWhen(r.createdAt)}{r.listingTitle ? ` · About ${r.listingTitle}` : ''}</p>
                    <Button variant="secondary" size="sm" className="self-start" loading={mark.isPending && mark.variables?.id === r.id} onClick={() => mark.mutate({ id: r.id, status: r.status === 'handled' ? 'new' : 'handled' })}>
                      <CheckCircle size={16} weight="bold" aria-hidden />
                      {r.status === 'handled' ? 'Mark as new' : 'Mark handled'}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <section className="flex flex-col gap-4" aria-labelledby="rp">
            <h2 id="rp" className="type-heading-2">Reported posts</h2>
            {q.data.reportedPosts.length === 0 ? (
              <EmptyState title="No reported posts." art="none" />
            ) : (
              <ul className="flex flex-col gap-3">
                {q.data.reportedPosts.map((p) => (
                  <li key={p.postId}>
                    <Card className="flex flex-col gap-3">
                      <p className="type-caption text-ink-muted">{p.groupName} · {p.reports} {p.reports === 1 ? 'report' : 'reports'}</p>
                      <p className="type-body">{p.body}</p>
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" onClick={() => moderate.mutate({ groupId: p.groupId, postId: p.postId, action: 'remove' })}>Remove post</Button>
                        <Button variant="secondary" size="sm" onClick={() => moderate.mutate({ groupId: p.groupId, postId: p.postId, action: 'keep' })}>Keep post</Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
