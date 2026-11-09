import { CalendarCheck, Flag, MapPin, ShieldCheck, UsersThree } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiGroup } from '@wayfare/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Field';
import { ScreenHeader, SectionTitle } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { errorMessage, RequestError } from '@/lib/api';
import { eventWhen, savedOn } from '@/lib/dates';
import { useEvents, useGroups, useJoinGroup, useMe, usePost, useReportPost, useRsvp } from '@/lib/queries';

function GroupCard({ g, isDemo }: { g: ApiGroup; isDemo: boolean }) {
  const { t } = useTranslation();
  const join = useJoinGroup();
  const post = usePost();
  const report = useReportPost();
  const [emailError, setEmailError] = useState<string | undefined>();
  const needsEmail = !!g.requiresDomain && !isDemo;

  const onJoin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = needsEmail ? String(new FormData(e.currentTarget).get('email') ?? '') : undefined;
    join.mutate(
      { id: g.id, email },
      {
        onSuccess: () => toast(`${t('community.joined')}: ${g.name}`),
        onError: (err) => (err instanceof RequestError && err.fields.email ? setEmailError(err.fields.email) : toast.error(errorMessage(err))),
      },
    );
  };

  const onPost = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(new FormData(form).get('body') ?? '').trim();
    if (!body) return;
    post.mutate({ id: g.id, body }, { onSuccess: () => form.reset(), onError: (err) => toast.error(errorMessage(err)) });
  };

  return (
    <Card as="article" tone={g.kind === 'university' ? 'white' : 'settle'} className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <UsersThree size={32} weight="regular" aria-hidden className="shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="type-title">{g.name}</h3>
          <p className="type-body-sm">{g.description}</p>
          <p className="inline-flex items-center gap-1 type-caption-strong">
            <ShieldCheck size={14} weight="bold" aria-hidden />
            {t('community.members', { count: g.memberCount })}
          </p>
        </div>
      </div>
      {!g.joined ? (
        <form onSubmit={onJoin} className="flex flex-col gap-3" noValidate>
          {needsEmail && <Input name="email" type="email" label={t('community.uniEmail')} hint={t('community.domainHint', { domain: g.requiresDomain })} error={emailError} />}
          <Button type="submit" variant="secondary" loading={join.isPending} loadingLabel="Joining">
            {t('community.join')}
          </Button>
        </form>
      ) : (
        <>
          {g.posts.length === 0 ? (
            <p className="type-body-sm">{t('community.noPosts')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {g.posts.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4">
                  <p className="type-caption-strong">
                    {p.authorName}
                    {p.official && <span className="ms-2 rounded-full bg-sage px-2">{t('community.official')}</span>}
                    <span className="ms-2 font-normal text-ink-muted">{savedOn(p.createdAt)}</span>
                  </p>
                  <p className="type-body-sm">{p.body}</p>
                  {p.reported ? (
                    <p className="type-caption text-ink-muted">{t('community.reported')}</p>
                  ) : (
                    <button
                      type="button"
                      className="tap inline-flex min-h-11 items-center gap-1 self-start type-caption-strong underline underline-offset-2"
                      onClick={() => report.mutate({ groupId: g.id, postId: p.id }, { onSuccess: () => toast(t('community.reported')), onError: (e) => toast.error(errorMessage(e)) })}
                    >
                      <Flag size={14} weight="bold" aria-hidden />
                      {t('community.report')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={onPost} className="flex flex-col gap-3">
            <Textarea name="body" label={t('community.postLabel')} rows={2} maxLength={1000} />
            <Button type="submit" variant="secondary" size="md" loading={post.isPending} loadingLabel="Posting" className="self-end">
              {t('community.post')}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}

export function Community() {
  const { t } = useTranslation();
  const me = useMe();
  const groups = useGroups();
  const events = useEvents();
  const rsvp = useRsvp();
  return (
    <div className="flex flex-col gap-6 px-4">
      <ScreenHeader back="/app" title={t('community.title')} sub={t('community.sub')} />
      <section aria-labelledby="ev" className="flex flex-col gap-4">
        <SectionTitle id="ev">{t('community.events')}</SectionTitle>
        {events.isPending ? (
          <LoadingList count={1} />
        ) : events.isError ? (
          <ErrorState error={events.error} onRetry={() => events.refetch()} />
        ) : events.data.length === 0 ? (
          <EmptyState title={t('home.noEvents')} art="none" />
        ) : (
          <ul className="flex flex-col gap-3">
            {events.data.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 rounded-3xl bg-white p-4 card-outline">
                <div className="flex items-start gap-3">
                  <CalendarCheck size={32} weight="regular" aria-hidden className="shrink-0" />
                  <div className="flex flex-col gap-1">
                    <p className="type-title">{e.title}</p>
                    <p className="type-body-sm">{eventWhen(e.startsAt)}</p>
                    <p className="inline-flex items-center gap-1 type-caption text-ink-muted"><MapPin size={14} weight="bold" aria-hidden />{e.place}</p>
                    {e.description && <p className="type-body-sm">{e.description}</p>}
                  </div>
                </div>
                <Button variant={e.going ? 'secondary' : 'secondary'} size="sm" aria-pressed={e.going} className={e.going ? 'bg-sage hover:bg-sage' : ''} onClick={() => rsvp.mutate(e.id, { onError: (err) => toast.error(errorMessage(err)) })}>
                  {e.going ? `${t('community.going')} · ${e.rsvpCount}` : t('community.rsvp')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="gr" className="flex flex-col gap-4">
        <SectionTitle id="gr">Groups</SectionTitle>
        {groups.isPending ? (
          <LoadingList count={2} />
        ) : groups.isError ? (
          <ErrorState error={groups.error} onRetry={() => groups.refetch()} />
        ) : groups.data.length === 0 ? (
          <EmptyState title="No groups for your university yet." body="They appear once your university joins Wayfare." />
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">{groups.data.map((g) => <GroupCard key={g.id} g={g} isDemo={!!me.data?.user?.isDemo} />)}</div>
        )}
      </section>
      <p className="type-caption text-ink-muted">{t('community.noDm')}</p>
    </div>
  );
}
