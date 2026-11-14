'use client';

import { ArrowRight, GitPullRequest, GraduationCap, Target } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import { ExampleLessonCard } from '@/app/learn/components/example-lesson-card';
import { type PromoSource, reportPromo, usePromoShown } from '@/app/learn/components/use-promo-report';
import { Button, buttonVariants } from '@/components/ui/button';
import { contributeSource } from '@/lib/contribute/click-tracking';
import { LEARN_PATH, LEARN_PROFILE_PATH } from '@/lib/learn/learn-path';
import { promoTitleOf, reasonLineOf, type ShownPromo } from '@/lib/learn/learn-promo';
import { cn } from '@/lib/utils';

const POINTS = [
  { icon: Target, title: 'Starts from your goal', text: 'A language, a domain or one project, at your level.' },
  {
    icon: GraduationCap,
    title: 'A lesson, not a wall of text',
    text: 'Five short steps with a picture or the code, and one question each.',
  },
  {
    icon: GitPullRequest,
    title: 'A real pull request at the end',
    text: 'It opens in your name once you pass the check.',
  },
];

const ACTION_CLASS = cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5 text-base font-semibold max-sm:w-full');

/** The lead for the viewer it suits: why, then what happens, about their language. */
const personalLead = ({ reason, language }: ShownPromo) =>
  [
    reasonLineOf(reason),
    `Your agent fixes a real ${language ?? 'open-source'} issue, and you get a 10-minute lesson on the fix.`,
  ]
    .filter(Boolean)
    .join(' ');

/**
 * GitRanks Learn on the home page, built like the Contribute section beside it: the pitch, and a step of the example
 * lesson. For a visitor (no `promo`) the same for everyone, into Learn's front door. For a signed-in user Learn may suit
 * (`promo`), in the Contribute section's place: why it suits them, "Set my goal" and "Not for me".
 */
export const LearnSectionView: FC<{ promo?: ShownPromo; onDismiss?: () => void }> = ({ promo, onDismiss }) => {
  const source: PromoSource = promo ? 'learn_promo_signed_in' : 'learn_promo_landing';
  const ref = usePromoShown<HTMLElement>(source);
  const clicked = () => reportPromo('promo_clicked', source);

  return (
    <section
      ref={ref}
      aria-labelledby="learn"
      data-learn-promo={promo ? 'personal' : 'visitor'}
      {...contributeSource(source)}
      className="grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-20"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            {promo ? 'For you' : 'New'}
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">GitRanks Learn</span>
        </div>
        <h2 id="learn" className="text-2xl font-semibold tracking-tight text-balance md:text-3xl lg:text-4xl">
          {promo ? promoTitleOf(promo.language) : 'Learn from real open-source fixes'}
        </h2>
        <p className="max-w-prose text-muted-foreground lg:text-lg">
          {promo
            ? personalLead(promo)
            : 'Your coding agent fixes a real issue. You get a 10-minute lesson on what was wrong and why the fix works, then the pull request opens in your name.'}
        </p>
        <ul className="flex flex-col gap-4">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-start gap-2">
          {promo ? (
            <div className="flex w-full flex-wrap items-center gap-3">
              <Link href={LEARN_PROFILE_PATH} prefetch={false} className={ACTION_CLASS} onClick={clicked}>
                Set my goal
                <ArrowRight aria-hidden />
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground max-sm:min-h-11 max-sm:w-full"
                onClick={onDismiss}
              >
                Not for me
              </Button>
            </div>
          ) : (
            <Link href={LEARN_PATH} prefetch={false} className={ACTION_CLASS} onClick={clicked}>
              See how Learn works
              <ArrowRight aria-hidden />
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {promo ? 'Only you see this. Free to use.' : 'Free to use. Every pull request says how it was made.'}
          </span>
        </div>
      </div>
      <div className="relative min-w-0">
        <ExampleLessonCard heading="h3" diagramId="landing-learn-example" />
      </div>
    </section>
  );
};
