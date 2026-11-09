import type { SsgoiFramework } from '@ssgoi/react';
import { drill, fade, slide, zoom } from '@ssgoi/react/view-transitions';
import { useLocation } from 'react-router';

export const TAB_ROUTES = ['/app', '/app/journey', '/app/housing', '/app/transit', '/app/me'] as const;
export const SETUP_STEPS = ['university', 'arrival', 'country', 'housing', 'eid'] as const;

const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Route rules from PROMPT.md 7.2. Under reduced motion every rule becomes a plain fade. */
export const ssgoiConfig = {
  transitions: prefersReducedMotion
    ? [{ on: '/**', transition: fade() }]
    : [
        { priority: -100, on: '/**', transition: fade() },
        { ordered: [...TAB_ROUTES], transition: slide() },
        { ordered: ['/app/welcome', ...SETUP_STEPS.map((s) => `/app/setup/${s}`)], transition: slide() },
        { from: '/app/journey', to: '/app/journey/*', transition: drill() },
        { from: '/app', to: '/app/journey/*', transition: drill() },
        { from: '/app/essentials', to: '/app/essentials/*', transition: drill() },
        { from: '/app/housing', to: '/app/housing/*', transition: zoom() },
      ],
};

export const ssgoiFramework: SsgoiFramework = { useRoute: () => useLocation() };
