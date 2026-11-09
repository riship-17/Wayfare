import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bank,
  Buildings,
  ChartLineUp,
  CheckCircle,
  CurrencyCircleDollar,
  FileText,
  GraduationCap,
  Info,
  Lightbulb,
  Lightning,
  ListChecks,
  Lock,
  MapPinLine,
  Path,
  ShieldCheck,
  Train,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Stage } from '@wayfare/shared';
import { EvCharging, Skyline } from '@/components/brand/Illustrations';
import { STAGE_BG, StageChip } from '@/components/brand/StageChip';
import { WayfareLogo } from '@/components/brand/WayfarePin';
import { Skeleton } from '@/components/ui/Skeleton';
import { get } from '@/lib/api';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';
import { useEssentials } from '@/lib/queries';
import { DATA_SOURCES } from '../me/About';
import { LivePhone, Reveal, TaglineReveal } from './parts';

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#universities', label: 'For universities' },
];

const KHDA = 'https://web.khda.gov.ae/en/About-Us/Whats-New/Dubais-private-higher-education-sector-continues';
const MEDIA_OFFICE = 'https://www.mediaoffice.ae/en/news/2025/may/19-05/dubais-private-higher-education';

function OpenApp({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <Link
      to="/app"
      className={cn(
        'tap inline-flex items-center justify-center gap-2 rounded-full bg-cornflower type-button text-ink hover:-translate-y-px hover:bg-cornflower-hover',
        size === 'lg' ? 'min-h-12 px-6' : 'min-h-11 px-3 py-2 type-button-sm',
        className,
      )}
    >
      Open the app
      <ArrowRight size={20} weight="bold" aria-hidden />
    </Link>
  );
}

function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = NAV.map((n) => document.querySelector(n.href)).filter(Boolean) as Element[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return active;
}

function Nav() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const active = useActiveSection();
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <div className="flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border-2 border-ink bg-white/85 py-2 ps-4 pe-2 backdrop-blur-md">
          <a href="#top" className="tap rounded-full" aria-label="Wayfare, back to top">
            <WayfareLogo size="sm" />
          </a>
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} aria-current={active === n.href ? 'true' : undefined} className={cn('tap inline-flex min-h-11 items-center rounded-full px-3 type-button-sm', active === n.href ? 'bg-cornflower-wash underline decoration-2 underline-offset-4' : 'hover:bg-cornflower-wash')}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <OpenApp className="hidden sm:inline-flex" />
            <button type="button" className="tap inline-flex size-11 items-center justify-center rounded-full hover:bg-cornflower-wash md:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
                <motion.line x1="4" x2="20" y1="8" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" animate={open ? { y1: 12, y2: 12, rotate: 45 } : { y1: 8, y2: 8, rotate: 0 }} transition={{ duration: 0.5, ease: EASE }} style={{ originX: '12px', originY: '12px' }} />
                <motion.line x1="4" x2="20" y1="16" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" animate={open ? { y1: 12, y2: 12, rotate: -45 } : { y1: 16, y2: 16, rotate: 0 }} transition={{ duration: 0.5, ease: EASE }} style={{ originX: '12px', originY: '12px' }} />
              </svg>
            </button>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div id="mobile-menu" className="fixed inset-0 z-30 flex flex-col bg-white/95 px-6 pt-24 backdrop-blur-xl md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <ul className="flex flex-col gap-2">
              {[...NAV, { href: '/app', label: 'Open the app' }].map((n, i) => (
                <motion.li key={n.href} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.4) }}>
                  {n.href.startsWith('#') ? (
                    <a href={n.href} onClick={() => setOpen(false)} className="tap flex min-h-14 items-center type-heading-2">
                      {n.label}
                    </a>
                  ) : (
                    <Link to={n.href} className="tap mt-4 flex min-h-12 items-center justify-center rounded-full bg-cornflower type-button">
                      {n.label}
                    </Link>
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-x-clip px-4 pt-24 pb-16 md:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-3 py-1 type-overline">
            <Lightning size={14} weight="bold" aria-hidden />
            EV World 2026 · Smart and Sustainable Mobility
          </span>
          <h1 className="type-hero-sm md:type-hero max-w-[680px]">
            Feel at home <br />
            <span className="mt-2 inline-block rounded-full bg-cornflower px-4 pb-1 text-ink">before you land.</span>
          </h1>
          <p className="type-body max-w-[680px] text-ink-muted">
            Wayfare is one trusted, guided journey for international students arriving in Dubai. Verified housing, an offline transit map and real costs in your home currency, ready before Day Zero.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <OpenApp size="lg" />
            <span className="type-body-sm text-ink-muted">Free for students. No documents uploaded.</span>
          </div>
          <p className="type-body-sm">
            42,026 students now study in Dubai. 35% are international.{' '}
            <a href={KHDA} target="_blank" rel="noreferrer" className="text-ink-muted underline underline-offset-2">
              Source: KHDA, 2024–25.
            </a>
          </p>
          <EvCharging className="hidden h-24 w-auto lg:block" />
        </div>
        <div className="relative flex justify-center">
          <LivePhone />
        </div>
      </div>
    </section>
  );
}

function Opportunity() {
  const stats = [
    { value: '42,026', label: 'students at 41 private higher education institutions in Dubai, 2024–25', src: KHDA, tone: 'bg-lilac' },
    { value: '35%', label: 'of them are international students, up 29%', src: KHDA, tone: 'bg-blush' },
    { value: '20%', label: 'growth in enrolment in one year', src: KHDA, tone: 'bg-sunshine' },
    { value: '50%', label: 'Dubai’s target share of international students by 2033', src: MEDIA_OFFICE, tone: 'bg-sage' },
  ];
  return (
    <section aria-labelledby="opp" className="px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Reveal>
          <p className="type-overline text-ink-muted">The opportunity</p>
          <h2 id="opp" className="type-display mt-2 max-w-[680px]">Dubai is becoming a global education hub</h2>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal as="li" key={s.value} delay={i * 0.06} className={cn('flex flex-col justify-between gap-4 rounded-3xl p-6', s.tone)}>
              <p className="type-display tabular-nums">{s.value}</p>
              <p className="type-body-sm">{s.label}</p>
              <a href={s.src} target="_blank" rel="noreferrer" className="type-caption underline underline-offset-2">
                {s.src === KHDA ? 'KHDA' : 'Dubai Media Office'}
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

const CHALLENGES: { icon: Icon; title: string; body: string }[] = [
  { icon: Buildings, title: 'Housing uncertainty', body: 'Finding verified accommodation from abroad.' },
  { icon: FileText, title: 'Documentation complexity', body: 'Visa, Emirates ID and formalities in the right order.' },
  { icon: CurrencyCircleDollar, title: 'Financial pressure', body: 'Budgeting with local costs in an unfamiliar currency.' },
  { icon: Info, title: 'Fragmented information', body: 'Many platforms and no single guide.' },
  { icon: UsersThree, title: 'Adjustment', body: 'Academics, culture and finding your people.' },
];

function Problem() {
  return (
    <section aria-labelledby="problem" className="px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Reveal className="flex max-w-[680px] flex-col gap-3">
          <p className="type-overline text-ink-muted">The student challenge</p>
          <h2 id="problem" className="type-display">Admission is connected. Arrival isn’t.</h2>
          <p className="type-body text-ink-muted">The Emirates ID arrives one to three weeks after landing, yet SIM plans, bank accounts, Ejari and the student nol card all ask for it. Students fill the gap with unverified brokers.</p>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CHALLENGES.map((c, i) => (
            <Reveal as="li" key={c.title} delay={i * 0.06} className="flex flex-col gap-3 rounded-3xl bg-white p-6 card-outline">
              <c.icon size={32} weight="regular" aria-hidden />
              <h3 className="type-title">{c.title}</h3>
              <p className="type-body-sm text-ink-muted">{c.body}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="flex flex-col gap-3 rounded-3xl bg-sage p-6 md:p-12">
          <Lightbulb size={32} weight="regular" aria-hidden />
          <p className="type-overline">The research insight</p>
          <p className="type-heading-1 max-w-[680px]">The problem is not the absence of services. It is the absence of coordination.</p>
          <p className="type-body max-w-[680px]">Students can access many essential services, but they need a unified, trusted and guided journey to navigate them efficiently.</p>
        </Reveal>
      </div>
    </section>
  );
}

const STAGES: { stage: Stage; when: string; items: string[] }[] = [
  { stage: 'prepare', when: 'Before departure', items: ['Verified housing', 'Personalised checklists', 'Document guidance', 'Budget in your home currency', 'Offline map download'] },
  { stage: 'arrive', when: 'Day Zero to Day 6', items: ['Airport to campus transit', 'SIM and transport card', 'Essential services', 'Medical and biometrics'] },
  { stage: 'settle', when: 'Week 1 onwards', items: ['Track your progress', 'Emirates ID unlocks', 'Banking and Ejari', 'University support and community'] },
];

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24 px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Reveal className="flex max-w-[680px] flex-col gap-3">
          <p className="type-overline text-ink-muted">Day Zero, fully charged</p>
          <h2 id="how-title" className="type-display">One platform. Three stages. One connected journey.</h2>
        </Reveal>
        <ol className="grid gap-4 lg:grid-cols-3">
          {STAGES.map((s, i) => (
            <Reveal as="li" key={s.stage} delay={i * 0.08} className={cn('flex flex-col gap-4 rounded-3xl p-6', STAGE_BG[s.stage])}>
              <StageChip stage={s.stage} className="self-start bg-white" />
              <p className="type-heading-3">{s.when}</p>
              <ul className="flex flex-col gap-2">
                {s.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 type-body">
                    <CheckCircle size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
                    {it}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FEATURES: { icon: Icon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: 'Verified accommodation', body: 'Your university checks the price, deposit and source before the badge shows.' },
  { icon: ListChecks, title: 'Smart checklists', body: 'Tasks know what needs your Emirates ID and what you can do today.' },
  { icon: Bank, title: 'Essential services guide', body: 'SIM, nol card, bank, Ejari and emergency numbers, with official links.' },
  { icon: Train, title: 'Offline RTA transit maps', body: 'Metro and tram routes that work with no data, from the airport to campus.' },
  { icon: UsersThree, title: 'Student community', body: 'Verified groups for your university and your home country.' },
  { icon: GraduationCap, title: 'University integration', body: 'Housing offices verify listings and post events in the portal.' },
];

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Reveal className="flex max-w-[680px] flex-col gap-3">
          <p className="type-overline text-ink-muted">Key features</p>
          <h2 id="features-title" className="type-display">Everything the first month needs, in one place</h2>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal as="li" key={f.title} delay={(i % 3) * 0.06} className="flex flex-col gap-3 rounded-3xl bg-white p-6 card-outline">
              <f.icon size={32} weight="regular" aria-hidden />
              <h3 className="type-heading-3">{f.title}</h3>
              <p className="type-body-sm text-ink-muted">{f.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function EidGap() {
  const q = useEssentials();
  return (
    <section aria-labelledby="gap" className="px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Reveal className="flex max-w-[680px] flex-col gap-3">
          <p className="type-overline text-ink-muted">The Emirates ID gap</p>
          <h2 id="gap" className="type-display">Most of Day Zero works with your passport</h2>
          <p className="type-body text-ink-muted">The card usually comes one to three weeks after you land. Wayfare shows what works today and what waits, with a bridge for each.</p>
        </Reveal>
        {q.isPending ? (
          <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>
        ) : q.isError ? (
          <p className="type-body-sm text-ink-muted">The service list could not load. Open the app to see it.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {[true, false].map((ready) => (
              <Reveal key={String(ready)} className={cn('flex flex-col gap-4 rounded-3xl p-6', ready ? 'bg-sage' : 'bg-lilac')}>
                <h3 className="flex items-center gap-2 type-heading-3">
                  {ready ? <CheckCircle size={20} weight="bold" aria-hidden /> : <Lock size={20} weight="bold" aria-hidden />}
                  {ready ? 'Works on Day Zero' : 'After your Emirates ID'}
                </h3>
                <ul className="flex flex-col gap-3">
                  {q.data.filter((s) => s.dayZeroReady === ready).map((s) => (
                    <li key={s.key} className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4">
                      <span className="type-title">{s.title}</span>
                      <span className="type-body-sm">{ready ? s.summary : (s.bridge ? `Meanwhile: ${s.bridge}` : s.summary)}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Impact() {
  const cards: { icon: Icon; title: string; body: string }[] = [
    { icon: ShieldCheck, title: 'Safer choices', body: 'Verified information instead of unknown brokers.' },
    { icon: Lightning, title: 'Smarter mobility', body: 'Transit first journeys from Day Zero.' },
    { icon: UsersThree, title: 'Stronger community', body: 'Moderated groups from your own university.' },
    { icon: ChartLineUp, title: 'A global education hub', body: 'A better welcome for the students Dubai wants to attract.' },
  ];
  return (
    <section aria-labelledby="impact" className="px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Reveal className="flex max-w-[680px] flex-col gap-3">
          <p className="type-overline text-ink-muted">The impact</p>
          <h2 id="impact" className="type-display">Smarter, greener journeys</h2>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <Reveal as="li" key={c.title} delay={i * 0.06} className="flex flex-col gap-3 rounded-3xl bg-white p-6 card-outline">
              <c.icon size={32} weight="regular" aria-hidden />
              <h3 className="type-title">{c.title}</h3>
              <p className="type-body-sm text-ink-muted">{c.body}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="on-ink grid items-center gap-8 rounded-3xl bg-ink p-6 text-white md:grid-cols-[1fr_auto] md:p-12">
          <div className="flex flex-col gap-4">
            <h3 className="type-heading-1 text-white">Driving smart and sustainable student mobility</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2 type-body text-white"><CheckCircle size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />Live now: offline RTA metro and tram maps from Day Zero</li>
              <li className="flex items-start gap-2 type-body text-white"><Path size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />Partly live: every verified listing shows its nearest station. Next, housing matched to metro and campus access</li>
              <li className="flex items-start gap-2 type-body text-white"><MapPinLine size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />Coming next: EV, charging and shared mobility partners</li>
            </ul>
            <p className="type-body-sm text-white">
              <span className="font-semibold">Seeking partners:</span> mobility operators, charging providers, policymakers and investors.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-4"><EvCharging className="h-32 w-auto" /></div>
        </Reveal>
      </div>
    </section>
  );
}

function Universities() {
  const health = useQuery({ queryKey: ['health'], queryFn: () => get<{ contactEmail: string }>('/health'), staleTime: Infinity });
  const email = health.data?.contactEmail;
  const ready = !!email && !email.startsWith('{{');
  const points = ['Verify listings with a price, deposit and source before students see them', 'Post welcome week and orientation events', 'Edit checklist steps and links for your own students', 'Review broker reports in one queue'];
  return (
    <section id="universities" aria-labelledby="uni" className="scroll-mt-24 px-4 py-16 md:px-6">
      <Reveal className="mx-auto grid max-w-6xl gap-8 rounded-3xl bg-cornflower-wash p-6 md:grid-cols-2 md:p-12">
        <div className="flex flex-col gap-4">
          <p className="type-overline text-ink-muted">For universities</p>
          <h2 id="uni" className="type-display">The live link between your housing office and your students</h2>
          <p className="type-body">Heriot-Watt University Dubai is the first university on Wayfare.</p>
          {ready ? (
            <a href={`mailto:${email}?subject=Wayfare%20partnership`} className="tap inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-white px-6 type-button card-outline hover:-translate-y-px">
              Partner with us
            </a>
          ) : (
            <span className="inline-flex min-h-12 cursor-not-allowed items-center self-start rounded-full bg-white px-6 type-button opacity-45 card-outline" aria-disabled="true">
              Partner with us
            </span>
          )}
          <Link to="/admin/login" className="inline-flex min-h-11 items-center self-start type-button-sm underline decoration-2 underline-offset-4">Staff sign in</Link>
        </div>
        <ul className="flex flex-col gap-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 rounded-2xl bg-white p-4 type-body">
              <CheckCircle size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

export const FAQ = [
  { q: 'Who verifies listings?', a: 'The university’s housing office, in the Wayfare portal. A place only shows the Verified badge and prices once staff add the price per room type, the deposit, and the source and date they checked it.' },
  { q: 'Does the transit map work offline?', a: 'Yes. The Dubai Metro and Tram map and the route planner are saved on your phone the first time you open the app, so you can route from DXB Terminal 1 or 3 to campus with no data.' },
  { q: 'Do I need an Emirates ID to use Wayfare?', a: 'No. Most of Day Zero works with your passport. Wayfare shows which tasks wait for the card and what to do meanwhile.' },
  { q: 'Which currencies can I see?', a: 'AED plus about 30 home currencies, using daily rates from Exchange Rate API. The rate date is always shown.' },
  { q: 'What data do you keep?', a: 'Your name, email, university, arrival date, home currency and the Emirates ID status you choose. Wayfare never asks for passport or Emirates ID numbers and never accepts document uploads.' },
  { q: 'Is Wayfare a government service?', a: 'No. Wayfare links to official sources such as ICP, RTA and Dubai Land Department. Always check them before you go.' },
  { q: 'Which universities are on Wayfare?', a: 'Heriot-Watt University Dubai is the first. Other universities can join through the portal.' },
];

function Faq() {
  useEffect(() => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    document.head.appendChild(s);
    return () => s.remove();
  }, []);
  return (
    <section aria-labelledby="faq" className="px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <Reveal><h2 id="faq" className="type-display">Questions students ask</h2></Reveal>
        <ul className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <li key={f.q}>
              <details className="group rounded-3xl bg-white p-6 card-outline [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 type-title">
                  {f.q}
                  <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink transition-transform duration-300 ease-wayfare group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 type-body text-ink-muted">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="final" className="px-4 py-16 md:px-6">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h2 id="final" className="type-hero-sm md:type-hero">
          Feel at home <span className="inline-block rounded-full bg-cornflower px-4 pb-1">before you land.</span>
        </h2>
        <p className="type-body max-w-[680px] text-ink-muted">Let's make every arrival a better beginning.</p>
        <OpenApp size="lg" />
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col">
      <Skyline className="h-24" />
      <div className="on-ink bg-ink px-4 py-12 text-white md:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <WayfareLogo tone="white" size="sm" />
            <p className="type-body-sm text-white">Wayfare. Study. Live. Belong.</p>
            <p className="type-body-sm text-white">Trusted. Simplified. Student-Centric.</p>
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-cornflower px-3 py-1 type-caption-strong text-ink">
              <Lightning size={14} weight="bold" aria-hidden />
              EV World 2026
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <p className="type-label text-white">Team</p>
            <p className="type-body-sm text-white">In collaboration with Heriot-Watt University Dubai · Design Management Project</p>
            <p className="type-body-sm text-white">Supervisor Professor: Houma</p>
            <p className="type-body-sm text-white">Members: Vruti Lakhani, Jhanvi Bhatt, Ahmed Amr Elsaey, Sina Zendaki, Keerthana Janakiraman</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="type-label text-white">Data sources</p>
            <ul className="flex flex-col gap-1">
              {DATA_SOURCES.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="type-caption text-white underline underline-offset-2">{s.label}</a></li>
              ))}
            </ul>
            <div className="mt-2 flex gap-4">
              <Link to="/privacy" className="inline-flex min-h-11 items-center type-body-sm text-white underline underline-offset-2">Privacy</Link>
              <Link to="/terms" className="inline-flex min-h-11 items-center type-body-sm text-white underline underline-offset-2">Terms</Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl type-caption text-white">Wayfare is not a government service. It links to official sources.</p>
      </div>
    </footer>
  );
}

export function Landing() {
  useEffect(() => {
    document.title = 'Wayfare: feel at home in Dubai before you land';
  }, []);
  return (
    <div className="bg-paper">
      <Nav />
      <main id="main">
        <Hero />
        <Opportunity />
        <Problem />
        <section aria-label="Our purpose" className="px-4 py-24 md:px-6">
          <TaglineReveal lines={['Make every arrival', 'a better beginning.']} />
        </section>
        <HowItWorks />
        <Features />
        <EidGap />
        <Impact />
        <Universities />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
