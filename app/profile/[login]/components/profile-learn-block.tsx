'use client';

import { ArrowRight, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import { reportPromo, usePromoShown } from '@/app/learn/components/use-promo-report';
import { Button, buttonVariants } from '@/components/ui/button';
import { contributeSource } from '@/lib/contribute/click-tracking';
import type { LearnPromoIssue } from '@/lib/learn/learn.types';
import { LEARN_PROFILE_PATH } from '@/lib/learn/learn-path';
import { languageColorOf, promoTitleOf, reasonLineOf, type ShownPromo } from '@/lib/learn/learn-promo';
import { cn } from '@/lib/utils';

/** One issue, drawn like the Contribute block's rows: the title, then the repository, its language and the lesson. */
const IssueRow: FC<{ issue: LearnPromoIssue; colors?: Readonly<Record<string, string>> }> = ({ issue, colors }) => (
  <article data-issue={`${issue.repo}#${issue.number}`} className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
    <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{issue.title}</span>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span className="truncate">
        <span className="sr-only">Repository: </span>
        {issue.repo} <span className="font-mono text-muted-foreground tabular-nums">#{issue.number}</span>
      </span>
      {issue.language ? (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border"
            style={{ backgroundColor: languageColorOf(issue.language, colors) }}
            aria-hidden
          />
          {issue.language}
        </span>
      ) : null}
      {issue.topic ? (
        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
          <GraduationCap className="size-4 shrink-0" aria-hidden />
          Lesson: {issue.topic}
        </span>
      ) : null}
    </div>
  </article>
);

/**
 * GitRanks Learn suggested on the signed-in owner's own profile, in the Contribute block's place and frame ("only you
 * see this"): why it suits them, issues it could teach on, "Set my goal" and "Not for me". `colors`: the profile's
 * languages, for the rows' dots.
 */
export const ProfileLearnBlock: FC<{
  promo: ShownPromo;
  onDismiss?: () => void;
  colors?: Readonly<Record<string, string>>;
}> = ({ promo, onDismiss, colors }) => {
  const ref = usePromoShown<HTMLElement>('learn_promo_profile');
  const lead = [
    reasonLineOf(promo.reason),
    promo.issues.length
      ? 'Your agent fixes one of these, you take a 10-minute lesson on the fix, and the pull request opens in your name.'
      : 'Your agent fixes a real issue, you take a 10-minute lesson on the fix, and the pull request opens in your name.',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={ref}
      aria-labelledby="profile-learn"
      data-learn-promo="profile"
      {...contributeSource('learn_promo_profile')}
      className="flex flex-col gap-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            GitRanks Learn · Only you see this
          </span>
          <h2 id="profile-learn" className="text-xl font-semibold tracking-tight text-balance">
            {promoTitleOf(promo.language)}
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">{lead}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground max-sm:min-h-11"
            onClick={onDismiss}
          >
            Not for me
          </Button>
          <Link
            href={LEARN_PROFILE_PATH}
            prefetch={false}
            onClick={() => reportPromo('promo_clicked', 'learn_promo_profile')}
            className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 font-semibold max-sm:min-h-11 max-sm:flex-1')}
          >
            Set my goal
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </div>
      {promo.issues.length ? (
        <div className="flex flex-col divide-y rounded-lg border bg-card text-card-foreground">
          {promo.issues.map((issue) => (
            <IssueRow key={`${issue.repo}#${issue.number}`} issue={issue} colors={colors} />
          ))}
        </div>
      ) : null}
    </section>
  );
};
