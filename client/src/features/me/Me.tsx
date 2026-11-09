import { CaretRight, CloudCheck, Flag, Globe, IdentificationCard, Info, Link as LinkIcon, PresentationChart, SignOut, Wallet } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { EID_STATUS_LABELS, SUPPORTED_CURRENCIES, type EidStatus } from '@wayfare/shared';
import { ReportSheet } from '@/components/housing/ReportSheet';
import { EidSheet } from '@/components/journey/EidSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input, Select } from '@/components/ui/Field';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { errorMessage, STATIC_DEMO } from '@/lib/api';
import { readKv } from '@/lib/db';
import { savedOn } from '@/lib/dates';
import { useBudget, useDemoControls, useInstitutions, useLogout, useMe, useShareBudget, useUpdateMe } from '@/lib/queries';
import { useUi } from '@/lib/store';

function Row({ icon: I, label, value, onClick, to }: { icon: typeof Info; label: string; value?: string; onClick?: () => void; to?: string }) {
  const inner = (
    <>
      <I size={20} weight="bold" aria-hidden className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col text-start">
        <span className="type-title">{label}</span>
        {value && <span className="type-body-sm text-ink-muted">{value}</span>}
      </span>
      <CaretRight size={20} weight="bold" aria-hidden />
    </>
  );
  const cls = 'tap flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-2 hover:bg-cornflower-wash';
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function OfflineDownloads() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<{ label: string; size: string; saved: string | null }[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const files = [
        { label: 'Transit map and routes', url: '/offline/transit.json' },
        { label: 'Essentials guide', url: '/offline/essentials.json' },
      ];
      const rows = await Promise.all(
        files.map(async (f) => {
          try {
            const res = await fetch(f.url);
            const size = Number(res.headers.get('content-length')) || (await res.clone().blob()).size;
            return { label: f.label, size: `${Math.max(1, Math.round(size / 1024))} KB`, saved: res.ok ? 'Saved' : null };
          } catch {
            return { label: f.label, size: '', saved: null };
          }
        }),
      );
      const journey = await readKv('journey');
      rows.push({ label: 'Your journey and budget', size: '', saved: journey ? t('me.lastSaved', { date: savedOn(journey.savedAt) }) : null });
      if (alive) setInfo(rows);
    })();
    return () => {
      alive = false;
    };
  }, [t]);
  return (
    <ul className="flex flex-col gap-2">
      {info.map((r) => (
        <li key={r.label} className="flex items-center justify-between gap-3 px-2 py-1">
          <span className="flex items-center gap-2 type-body-sm">
            <CloudCheck size={20} weight="bold" aria-hidden />
            {r.label}
          </span>
          <span className="type-caption text-ink-muted">{[r.size, r.saved ?? t('me.notSaved')].filter(Boolean).join(' · ')}</span>
        </li>
      ))}
    </ul>
  );
}

function PresenterControls() {
  const { t } = useTranslation();
  const demo = useDemoControls();
  const setJustUnlocked = useUi((s) => s.setJustUnlocked);
  const run = (input: { arrivalOffsetDays?: number; eidStatus?: EidStatus; reset?: boolean }, done?: string) =>
    demo.mutate(input, {
      onSuccess: (r) => {
        if (input.eidStatus === 'card_received' && r.unlocked.length) {
          setJustUnlocked(r.unlocked);
          window.setTimeout(() => setJustUnlocked([]), 2500);
          toast(t('eid.unlockToast', { count: r.unlocked.length }));
        } else if (done) toast(done);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  return (
    <Card tone="wash" className="flex flex-col gap-3" aria-labelledby="presenter">
      <h2 id="presenter" className="flex items-center gap-2 type-title">
        <PresentationChart size={20} weight="bold" aria-hidden />
        {t('me.presenter')}
      </h2>
      <p className="type-body-sm">{t('me.presenterSub')}</p>
      {STATIC_DEMO && <p className="type-caption text-ink-muted">Online demo: changes are saved in this browser only. Reset demo starts over.</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={() => run({ arrivalOffsetDays: 12 }, t('me.arriveIn12'))}>{t('me.arriveIn12')}</Button>
        <Button variant="secondary" size="sm" onClick={() => run({ arrivalOffsetDays: 0, eidStatus: 'arrived' }, t('me.arriveToday'))}>{t('me.arriveToday')}</Button>
        <Button variant="secondary" size="sm" onClick={() => run({ arrivalOffsetDays: -10, eidStatus: 'residence_issued' }, t('me.weekTwo'))}>{t('me.weekTwo')}</Button>
        <Button variant="secondary" size="sm" onClick={() => run({ eidStatus: 'card_received' })}>{t('me.receiveEid')}</Button>
      </div>
      <Button variant="ghost" onClick={() => run({ reset: true }, t('me.reset'))}>{t('me.reset')}</Button>
    </Card>
  );
}

export function Me() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useMe();
  const update = useUpdateMe();
  const logout = useLogout();
  const budget = useBudget();
  const share = useShareBudget();
  const institutions = useInstitutions();
  const [eidOpen, setEidOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const user = me.data?.user;
  if (!user) return null;
  const uni = institutions.data?.find((i) => i.id === user.institutionId);
  const set = (input: Parameters<typeof update.mutate>[0]) => update.mutate(input, { onSuccess: () => toast(t('me.saved')), onError: (e) => toast.error(errorMessage(e)) });

  return (
    <div className="flex max-w-3xl flex-col gap-6 px-4">
      <ScreenHeader title={t('me.title')} />
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="type-heading-2">{user.name}</p>
          {user.isDemo && <Chip tone="prepare">{t('me.demoStudent')}</Chip>}
        </div>
        <p className="type-body-sm text-ink-muted">{user.email}</p>
        {uni && <p className="type-body-sm">{uni.name}</p>}
      </Card>

      <section aria-labelledby="profile" className="flex flex-col gap-4">
        <h2 id="profile" className="type-heading-3">{t('me.profile')}</h2>
        <Input type="date" label={t('me.arrival')} defaultValue={user.arrivalDate ?? ''} key={user.arrivalDate} onBlur={(e) => e.target.value && e.target.value !== user.arrivalDate && set({ arrivalDate: e.target.value })} />
        <Select label={t('me.currency')} value={user.homeCurrency} onChange={(e) => set({ homeCurrency: e.target.value })}>
          {['AED', ...SUPPORTED_CURRENCIES].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label={t('me.language')} value="en" onChange={() => undefined}>
          <option value="en">{t('me.english')}</option>
        </Select>
      </section>

      <div className="flex flex-col">
        <Row icon={IdentificationCard} label={t('me.eid')} value={EID_STATUS_LABELS[user.eidStatus]} onClick={() => setEidOpen(true)} />
        <Row icon={Wallet} label={t('home.budget')} to="/app/budget" />
        <div className="flex min-h-14 items-center gap-3 px-2 py-2">
          <LinkIcon size={20} weight="bold" aria-hidden className="shrink-0" />
          <span className="flex flex-1 flex-col">
            <span className="type-title">{t('me.shareLink')}</span>
            <span className="type-body-sm text-ink-muted">{budget.data?.shareActive ? t('me.shareOn') : t('me.shareOffState')}</span>
          </span>
          {budget.data?.shareActive && (
            <Button variant="danger" size="sm" loading={share.isPending} loadingLabel="Turning off" onClick={() => share.mutate(false, { onSuccess: () => toast(t('budget.shareOffDone')) })}>
              {t('budget.shareOff')}
            </Button>
          )}
        </div>
        <Row icon={Flag} label={t('me.report')} onClick={() => setReportOpen(true)} />
        <Row icon={Info} label={t('me.about')} to="/app/me/about" />
        <Row icon={Globe} label="Wayfare website" to="/" />
      </div>

      <section aria-labelledby="offline" className="flex flex-col gap-3">
        <h2 id="offline" className="type-heading-3">{t('me.offline')}</h2>
        <OfflineDownloads />
      </section>

      {user.isDemo && me.data?.demoMode && <PresenterControls />}

      <Button variant="secondary" block loading={logout.isPending} loadingLabel="Signing out" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/app/welcome') })}>
        <SignOut size={20} weight="bold" aria-hidden />
        {t('me.signOut')}
      </Button>
      <EidSheet open={eidOpen} onOpenChange={setEidOpen} current={user.eidStatus} />
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}
