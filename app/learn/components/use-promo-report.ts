'use client';

import { type RefObject, useEffect, useRef } from 'react';

import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import type { LearnSource } from '@/lib/contribute/click-tracking';

/** The Learn suggestions, each with its own place in the click log. */
export type PromoSource = Extract<LearnSource, `learn_promo_${string}`>;

/** How much of a suggestion is on screen before it counts as shown: half of it, or half the screen when it is taller. */
const SHOWN_AT = 0.5;
/** Steps at which the browser re-checks, so a section taller than twice the screen is still seen crossing half of it. */
const STEPS = Array.from({ length: 11 }, (_, step) => step * 0.05);

/**
 * The page a suggestion's report names: the owner's own profile is named only as a profile, so the report never carries
 * who the owner is. Any other suggestion names its page.
 */
const pathOf = (source: PromoSource) => (source === 'learn_promo_profile' ? '/profile' : window.location.pathname);

const report = (event: Parameters<typeof reportLearnEvent>[0]) =>
  reportLearnEvent(event, undefined, pathOf(event.source as PromoSource));

/**
 * Counts a Learn suggestion as shown once half of it is on screen (or half the screen, for one taller than that), once
 * per page shown, and returns the ref for its section. Where the browser cannot tell (no `IntersectionObserver`), it
 * counts on the first render.
 */
export function usePromoShown<T extends Element>(source: PromoSource): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const shown = () => report({ kind: 'learn_view', event: 'promo_shown', source });
    if (typeof IntersectionObserver !== 'function') {
      shown();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.some(
          (entry) =>
            entry.isIntersecting &&
            (entry.intersectionRatio >= SHOWN_AT || entry.intersectionRect.height >= window.innerHeight * SHOWN_AT),
        );
        if (!seen) return;
        observer.disconnect();
        shown();
      },
      { threshold: STEPS },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);
  return ref;
}

/** A Learn suggestion followed (`promo_clicked`) or turned down (`promo_dismissed`). */
export const reportPromo = (event: 'promo_clicked' | 'promo_dismissed', source: PromoSource) =>
  report({ kind: 'learn_click', event, source });
