'use client';

import { type RefObject, useEffect, useRef } from 'react';

import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import type { LearnSource } from '@/lib/contribute/click-tracking';

/** The Learn suggestions, each with its own place in the click log. */
export type PromoSource = Extract<LearnSource, `learn_promo_${string}`>;

/** How much of a suggestion is on screen before it counts as shown. */
const SHOWN_AT = 0.5;

/**
 * Counts a Learn suggestion as shown once it is half on screen, once per page shown, and returns the ref for its
 * section. Where the browser cannot tell (no `IntersectionObserver`), it counts on the first render.
 */
export function usePromoShown<T extends Element>(source: PromoSource): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const shown = () => reportLearnEvent({ kind: 'learn_view', event: 'promo_shown', source });
    if (typeof IntersectionObserver !== 'function') {
      shown();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        shown();
      },
      { threshold: SHOWN_AT },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);
  return ref;
}

/** A Learn suggestion followed (`promo_clicked`) or turned down (`promo_dismissed`). */
export const reportPromo = (event: 'promo_clicked' | 'promo_dismissed', source: PromoSource) =>
  reportLearnEvent({ kind: 'learn_click', event, source });
