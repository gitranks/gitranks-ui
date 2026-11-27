'use client';

import { ArrowLeft, BookOpen, Check } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { NextStrip } from './next-strip';
import { RoundsGlance } from './rounds-glance';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/workspace/kbd';
import type { NextScreen, NextThing } from '@/lib/interviews/next';
import type { InterviewPlanPage } from '@/lib/interviews/types';

/** Controls that take Enter themselves: Enter on one of them is theirs, not the screen's. */
const TAKES_ENTER = 'a, button, input, textarea, select, summary, [role="dialog"], [contenteditable="true"]';

/** Enter, where nothing else on the screen takes it, opens the main button's address. */
function useEnterOpens(href: Route | null) {
  const router = useRouter();
  useEffect(() => {
    if (!href) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.repeat || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(TAKES_ENTER)) return;
      event.preventDefault();
      router.push(href);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [href, router]);
}

/** The main button: a link drawn as the site's large button, with its Enter key on a wide screen. */
function Main({ href, label }: { href: Route; label: string }) {
  return (
    <Button asChild size="lg" className="font-semibold max-sm:min-h-11 max-sm:w-full">
      <Link href={href}>
        {label}
        <span aria-hidden="true" className="max-sm:hidden">
          <Kbd onPrimary>⏎</Kbd>
        </span>
      </Link>
    </Button>
  );
}

/** The next thing with its one action, in one card. */
function Next({ next }: { next: NextThing }) {
  if (next.kind === 'finished') {
    return (
      <section
        aria-label="What comes next"
        data-next-thing="finished"
        className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Main href={next.main.href} label={next.main.label} />
          <Button asChild size="lg" variant="outline" className="font-semibold max-sm:min-h-11 max-sm:w-full">
            <Link href={next.other.href}>{next.other.label}</Link>
          </Button>
        </div>
        <p className="m-0 text-xs text-muted-foreground">{next.note}</p>
      </section>
    );
  }
  return (
    <section
      aria-label="What comes next"
      data-next-thing={next.kind}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-foreground">Next</span>
        <div className="flex items-start gap-2.5">
          <BookOpen aria-hidden="true" className="mt-[3px] size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="m-0 text-base font-semibold">{next.title}</h2>
            {next.sub && <span className="text-sm text-muted-foreground">{next.sub}</span>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Main href={next.href} label={next.label} />
      </div>
      {next.kind === 'lessons' && next.note && <p className="m-0 text-xs text-muted-foreground">{next.note}</p>}
    </section>
  );
}

/**
 * The connecting screen, as it is drawn for the person: the strip; then one column with the same parts in every case:
 * what was done, where they stand as the rounds on one line, the next thing with its one action, "Back to the plan".
 * `screen` null: their side is still being read, and the column keeps its place, empty.
 */
export function NextView({ plan, screen }: { plan: InterviewPlanPage; screen: NextScreen | null }) {
  const main = screen?.next ? (screen.next.kind === 'finished' ? screen.next.main.href : screen.next.href) : null;
  useEnterOpens(main);
  return (
    <>
      <NextStrip plan={plan} strip={screen?.strip ?? null} />
      <main
        className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16 sm:pt-12"
        data-next-screen={screen?.head.kind ?? 'reading'}
      >
        {screen ? (
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-positive">
                <Check aria-hidden="true" className="size-4 shrink-0" />
                Done
              </span>
              <h1 className="m-0 text-3xl font-bold tracking-tight text-balance">{screen.head.title}</h1>
              {(screen.head.lead || screen.head.where) && (
                <p className="m-0 text-base text-muted-foreground">
                  {screen.head.lead}
                  {screen.head.where && <span className="max-sm:hidden"> {screen.head.where}</span>}
                </p>
              )}
            </div>
            <RoundsGlance plan={plan} screen={screen} />
            {screen.next && <Next next={screen.next} />}
            <Link
              href={screen.back}
              className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:underline max-sm:min-h-11"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to the plan
            </Link>
          </div>
        ) : (
          <div className="mx-auto min-h-[420px] w-full max-w-[640px]" aria-busy="true" />
        )}
      </main>
    </>
  );
}
