'use client';

import { Check, Search } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { readFeedComputedAt } from '../actions';
import { useOnboardedPush } from './use-onboarded-push';
import {
  MATCHING_CONTINUE_MS,
  MATCHING_GIVE_UP_MS,
  MATCHING_LINES,
  MATCHING_POLL_MS,
  matchingLinesOf,
  matchingTicksOf,
} from '@/lib/contribute/matching';
import { cn } from '@/lib/utils';

export const ISSUES_PATH: Route = '/contribute/issues';

/** Where each chip floats beside the orb; on a phone they sit closer in. */
const CHIP_PLACES = [
  'top-[22px] -left-[58px] sm:-left-[86px]',
  'top-[46px] -right-[72px] sm:-right-[104px]',
  'bottom-[18px] -left-[44px] sm:-left-[64px]',
  '-bottom-[14px] -right-[60px] sm:bottom-[6px] sm:-right-[90px]',
];

/**
 * The matching moment after a key is stored, in place of the form: an orb with rings, the profile's languages
 * floating in, and four lines that tick one by one. The last ticks once the picks are computed (asked every 1.5s);
 * then the page goes on to Issues by itself. Without picks after 20s it goes on anyway. Reduced motion stops the
 * animation, never the ticks.
 */
export function Matching({ languages, initialTicks = 0 }: { languages: string[]; initialTicks?: number }) {
  const push = useOnboardedPush();
  const headline = useRef<HTMLHeadingElement>(null);
  const started = useRef<number | null>(null);
  const gone = useRef(false);
  const goOn = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    push(ISSUES_PATH);
  }, [push]);
  const [elapsed, setElapsed] = useState(0);
  const [computed, setComputed] = useState(false);
  const ticks = Math.max(initialTicks, matchingTicksOf(elapsed, computed));
  const done = ticks >= MATCHING_LINES;
  const lines = matchingLinesOf(languages);

  useEffect(() => {
    headline.current?.focus();
  }, []);

  // The clock the lines tick by, and the way on without picks.
  useEffect(() => {
    if (done) return;
    started.current ??= Date.now();
    const timer = setInterval(() => {
      const now = Date.now() - (started.current ?? Date.now());
      setElapsed(now);
      if (now >= MATCHING_GIVE_UP_MS) goOn();
    }, 150);
    return () => clearInterval(timer);
  }, [done, goOn]);

  // Whether the picks are computed, asked while the tab is shown.
  useEffect(() => {
    if (computed) return;
    let stopped = false;
    const ask = async () => {
      if (document.visibilityState !== 'visible') return;
      const result = await readFeedComputedAt();
      if (!stopped && result.ok && result.data) setComputed(true);
    };
    void ask();
    const timer = setInterval(ask, MATCHING_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [computed]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(goOn, MATCHING_CONTINUE_MS);
    return () => clearTimeout(timer);
  }, [done, goOn]);

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-9 py-12"
      data-matching={done ? 'done' : 'working'}
    >
      {/* The page's glow, behind the bar and the content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_40%,var(--color-violet-50)_0,transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--color-violet-950)_60%,transparent)_0,transparent_60%)]"
      />
      <div aria-hidden="true" className="relative size-42">
        {[0, 0.8, 1.6].map((delay) => (
          <span
            key={delay}
            className="absolute inset-0 rounded-full border-2 border-violet-400 opacity-0 motion-safe:animate-contribute-ring motion-reduce:opacity-40"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span className="absolute inset-[34px] flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_40px_rgba(124,58,237,0.35)]">
          {done ? <Check className="size-11" strokeWidth={2.6} /> : <Search className="size-10" strokeWidth={2} />}
        </span>
        {languages.slice(0, CHIP_PLACES.length).map((language, index) => (
          <span
            key={language}
            className={cn(
              'absolute rounded-full border bg-background px-2.5 py-1 text-xs font-semibold whitespace-nowrap sm:text-[13px] motion-safe:animate-contribute-float',
              CHIP_PLACES[index],
            )}
            style={{ animationDelay: `${index * 0.6}s` }}
          >
            {language}
          </span>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2.5 text-center">
        <h1
          ref={headline}
          tabIndex={-1}
          className="text-[28px] font-extrabold tracking-tight outline-none sm:text-[34px]"
        >
          {done ? 'Your first issues are ready' : 'Matching you with issues'}
        </h1>
        <p className="max-w-[520px] text-muted-foreground">
          {done
            ? 'Ranked by your languages and the repos you know. Your agent starts on one of the top ones shortly.'
            : 'This takes a few seconds. We look for issues maintainers want solved, in repos that merge outside work.'}
        </p>
      </div>

      <ol aria-live="polite" className="flex w-full max-w-[440px] flex-col gap-3">
        {lines.slice(0, Math.min(ticks + 1, MATCHING_LINES)).map((line, index) => {
          const ticked = index < ticks;
          return (
            <li
              key={line}
              data-line={ticked ? 'done' : 'active'}
              className="flex items-center gap-3 text-[15px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-450"
            >
              {ticked ? (
                <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                  <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="m-0.5 size-[18px] flex-none rounded-full border-[2.5px] border-violet-200 border-t-primary motion-safe:animate-spin dark:border-violet-900 dark:border-t-primary"
                />
              )}
              <span className={ticked ? undefined : 'font-semibold'}>
                {line}
                {ticked ? <span className="sr-only"> (done)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>

      {done ? (
        <Link
          href={ISSUES_PATH}
          prefetch={false}
          onClick={(event) => {
            // The way on reads the bar again, for the tabs; a new tab or window loads it whole anyway.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            goOn();
          }}
          className="inline-flex min-h-12 items-center rounded-[10px] bg-primary px-[22px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          See my issues
        </Link>
      ) : null}
    </div>
  );
}
