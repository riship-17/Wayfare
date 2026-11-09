import { CheckCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  COUNTRY_CURRENCY,
  EID_STATUSES,
  EID_STATUS_LABELS,
  HOUSING_NEEDS,
  PHASES,
  SUPPORTED_CURRENCIES,
  dubaiDateString,
  type Battery,
  type EidStatus,
  type HousingNeed,
} from '@wayfare/shared';
import { JourneyBattery } from '@/components/brand/JourneyBattery';
import { VerifiedBadge } from '@/components/brand/Badges';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useEidStatus, useInstitutions, useMe, useUpdateMe } from '@/lib/queries';
import { SETUP_STEPS } from '@/ssgoi';

type Step = (typeof SETUP_STEPS)[number];

/** The set up battery fills one cell after another as the student answers. */
function progressBattery(done: number): Battery {
  const share = done / SETUP_STEPS.length;
  const cells = PHASES.map((phase, i) => {
    const value = Math.min(1, Math.max(0, share * 4 - i));
    return { phase, done: 0, applicable: 0, value };
  });
  return { cells, percent: Math.round(share * 100) };
}

function Choice({ checked, onSelect, name, children }: { checked: boolean; onSelect: () => void; name: string; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        'tap flex min-h-14 cursor-pointer items-center gap-3 rounded-3xl border-[2.5px] border-ink px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
        checked ? 'bg-cornflower-wash' : 'bg-white hover:bg-cornflower-wash',
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onSelect} />
      <span className="flex flex-1 flex-col gap-1">{children}</span>
      <CheckCircle size={20} weight={checked ? 'fill' : 'bold'} className={checked ? 'text-ink' : 'text-hairline'} aria-hidden />
    </label>
  );
}

export function Setup() {
  const { step = 'university' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useMe();
  const update = useUpdateMe();
  const eid = useEidStatus();
  const institutions = useInstitutions();
  const user = me.data?.user;
  const idx = SETUP_STEPS.indexOf(step as Step);

  const [institutionId, setInstitutionId] = useState(user?.institutionId ?? '');
  const [search, setSearch] = useState('');
  const [arrival, setArrival] = useState(user?.arrivalDate ?? dubaiDateString(new Date(), 21));
  const [country, setCountry] = useState(user?.homeCountry ?? '');
  const [currency, setCurrency] = useState(user?.homeCurrency && user.homeCurrency !== 'AED' ? user.homeCurrency : '');
  const [housing, setHousing] = useState<HousingNeed | ''>(user?.housingNeed ?? '');
  const [eidStatus, setEidStatus] = useState<EidStatus>(user?.eidStatus ?? 'not_started');
  const [error, setError] = useState<string | null>(null);

  const countries = useMemo(() => Object.keys(COUNTRY_CURRENCY).sort(), []);
  const list = (institutions.data ?? []).filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));

  if (idx < 0) return <Navigate to="/app/setup/university" replace />;
  if (!user) return <Navigate to="/app/welcome" replace />;

  const next = () => navigate(idx < SETUP_STEPS.length - 1 ? `/app/setup/${SETUP_STEPS[idx + 1]}` : '/app');
  const save = (input: Parameters<typeof update.mutate>[0], then = next) =>
    update.mutate(input, { onSuccess: () => then(), onError: (e) => setError(errorMessage(e)) });

  const submit = () => {
    setError(null);
    if (step === 'university') {
      if (!institutionId) return setError('Pick your university to continue.');
      return save({ institutionId });
    }
    if (step === 'arrival') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival)) return setError('Pick a date.');
      return save({ arrivalDate: arrival });
    }
    if (step === 'country') {
      if (!country) return setError('Pick the country you are coming from.');
      return save({ homeCountry: country, homeCurrency: currency || COUNTRY_CURRENCY[country] || 'USD' });
    }
    if (step === 'housing') {
      if (!housing) return setError('Pick one option.');
      return save({ housingNeed: housing });
    }
    eid.mutate(eidStatus, {
      onSuccess: () => save({ onboarded: true }, () => {
        toast(t('home.chargedBy'));
        navigate('/app');
      }),
      onError: (e) => setError(errorMessage(e)),
    });
  };

  const titles: Record<Step, [string, string]> = {
    university: [t('setup.university'), t('setup.universityHint')],
    arrival: [t('setup.arrival'), t('setup.arrivalHint')],
    country: [t('setup.country'), t('setup.countryHint')],
    housing: [t('setup.housing'), ''],
    eid: [t('setup.eid'), t('setup.eidHint')],
  };
  const [title, sub] = titles[step as Step];

  return (
    <div className="flex min-h-dvh flex-col px-4">
      <div className="pt-6">
        <JourneyBattery battery={progressBattery(idx)} size="sm" showArt={false} />
        <p className="mt-2 type-caption text-ink-muted">{t('setup.progress', { n: idx + 1, total: SETUP_STEPS.length })}</p>
      </div>
      <ScreenHeader back={idx === 0 ? '/app/welcome' : `/app/setup/${SETUP_STEPS[idx - 1]}`} title={title} sub={sub || undefined} />

      <form
        className="mt-6 flex flex-1 flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        {step === 'university' && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Input label={t('setup.searchUniversity')} hideLabel placeholder={t('setup.searchUniversity')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-12" />
              <MagnifyingGlass size={20} weight="bold" className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2" aria-hidden />
            </div>
            {institutions.isPending ? (
              <LoadingList count={1} />
            ) : institutions.isError ? (
              <ErrorState error={institutions.error} onRetry={() => institutions.refetch()} />
            ) : list.length === 0 ? (
              <EmptyState title={t('setup.noUniversity')} art="none" />
            ) : (
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">{t('setup.university')}</legend>
                {list.map((i) => (
                  <Choice key={i.id} name="institution" checked={institutionId === i.id} onSelect={() => setInstitutionId(i.id)}>
                    <span className="type-title">{i.name}</span>
                    <span className="type-body-sm text-ink-muted">{i.area}</span>
                    <VerifiedBadge verified institution="Wayfare" className="self-start" />
                  </Choice>
                ))}
              </fieldset>
            )}
          </div>
        )}

        {step === 'arrival' && <Input type="date" label={t('setup.arrival')} hideLabel value={arrival} min={dubaiDateString(new Date(), -180)} onChange={(e) => setArrival(e.target.value)} />}

        {step === 'country' && (
          <div className="flex flex-col gap-6">
            <Select
              label={t('setup.country')}
              hideLabel
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCurrency(COUNTRY_CURRENCY[e.target.value] ?? '');
              }}
            >
              <option value="">Choose a country</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select label={t('setup.currency')} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="">Choose a currency</option>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        )}

        {step === 'housing' && (
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">{t('setup.housing')}</legend>
            {HOUSING_NEEDS.map((h) => (
              <Choice key={h} name="housing" checked={housing === h} onSelect={() => setHousing(h)}>
                <span className="type-title">{t(`setup.housingNeed.${h}`)}</span>
              </Choice>
            ))}
          </fieldset>
        )}

        {step === 'eid' && (
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">{t('setup.eid')}</legend>
            {EID_STATUSES.map((s) => (
              <Choice key={s} name="eid" checked={eidStatus === s} onSelect={() => setEidStatus(s)}>
                <span className="type-title">{EID_STATUS_LABELS[s]}</span>
              </Choice>
            ))}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="type-body-sm text-alert">
            {error}
          </p>
        )}
        <div className="sticky bottom-0 mt-auto bg-paper pt-4 pb-6">
          <Button type="submit" block loading={update.isPending || eid.isPending} loadingLabel="Saving">
            {step === 'eid' ? t('setup.finish') : t('common.continue')}
          </Button>
        </div>
      </form>
    </div>
  );
}
