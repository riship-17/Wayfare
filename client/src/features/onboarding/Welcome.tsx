import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { Stage } from '@wayfare/shared';
import { Skyline } from '@/components/brand/Illustrations';
import { StageChip, STAGE_BG } from '@/components/brand/StageChip';
import { WayfareLogo } from '@/components/brand/WayfarePin';
import { Button } from '@/components/ui/Button';
import { errorMessage, STATIC_DEMO } from '@/lib/api';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';
import { useDemoLogin, useMe } from '@/lib/queries';

const SLIDES: Stage[] = ['prepare', 'arrive', 'settle'];

export function Welcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useMe();
  const demo = useDemoLogin();
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  const tryDemo = () =>
    demo.mutate('student', {
      onSuccess: () => navigate('/app'),
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col gap-6 px-4 pt-8">
        <WayfareLogo size="sm" />
        <div className="flex flex-col gap-2">
          <h1 className="type-display">{t('welcome.title')}</h1>
          <p className="type-body text-ink-muted">{t('welcome.sub')}</p>
        </div>
      </div>

      <section aria-roledescription="carousel" aria-label="What Wayfare does" className="mt-6">
        <div
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto focus-visible:outline-offset-[-3px]"
          tabIndex={0}
          aria-label="Stages, scroll sideways"
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {SLIDES.map((s, i) => (
            <div key={s} className="w-full shrink-0 snap-center px-4" role="group" aria-roledescription="slide" aria-label={t('welcome.slide', { n: i + 1, total: SLIDES.length })}>
              <motion.div
                className={cn('flex min-h-48 flex-col justify-between gap-6 rounded-3xl p-6', STAGE_BG[s])}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
              >
                <StageChip stage={s} className="self-start bg-white" />
                <p className="type-heading-2">{t(`welcome.${s}`)}</p>
              </motion.div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => goTo(i)}
              className="tap flex size-11 items-center justify-center rounded-full"
              aria-label={t('welcome.slide', { n: i + 1, total: SLIDES.length })}
              aria-current={index === i || undefined}
            >
              <span className={cn('block h-2 rounded-full transition-all duration-300', index === i ? 'w-6 bg-ink' : 'w-2 bg-hairline')} />
            </button>
          ))}
        </div>
      </section>

      <div className="mt-auto flex flex-col items-center gap-2 px-4 pt-6 pb-4">
        <Button block onClick={() => navigate(me.data?.user ? '/app' : '/app/create')}>
          {t('welcome.cta')}
        </Button>
        <Link to="/app/sign-in" className="tap inline-flex min-h-11 items-center rounded-full px-3 type-button-sm underline decoration-2 underline-offset-4">
          {t('welcome.haveAccount')}
        </Link>
        {me.data?.demoMode !== false && (
          <button type="button" onClick={tryDemo} disabled={demo.isPending} className="tap inline-flex min-h-11 items-center rounded-full px-3 type-body-sm text-ink-muted underline underline-offset-4 disabled:opacity-50">
            {demo.isPending ? 'Opening the demo' : t('welcome.demo')}
          </button>
        )}
      </div>
      {STATIC_DEMO && <p className="px-4 pb-2 text-center type-caption text-ink-muted">Online demo. Everything you do stays in this browser.</p>}
      <Skyline className="h-16" />
    </div>
  );
}
