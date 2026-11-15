'use client';

import { Check } from 'lucide-react';
import { useId } from 'react';
import { ClipLoader } from 'react-spinners';

import { useBadgeCheck } from '../hooks/use-badge-check';
import { BADGE_CHECK_COPY, badgeCheckViewOf } from '../utils/badge-check';
import { Button } from '@/components/ui/button';
import type { BadgeCheckKind } from '@/types/daily-updates.types';

type DailyUpdatesCardProps = {
  kind: BadgeCheckKind;
  /** The profile's login or the repository's `owner/name`, as GitRanks stores it. */
  name: string;
};

/**
 * "Get daily updates", under the badge's code: a profile or repository with a GitRanks badge in its README updates
 * every day, and "Check my badge" reads the README now instead of waiting for GitHub to load the badge. No sign-in.
 */
export function DailyUpdatesCard({ kind, name }: Readonly<DailyUpdatesCardProps>) {
  const headingId = useId();
  const { result, checking, check } = useBadgeCheck(kind, name);
  const view = badgeCheckViewOf(kind, name, result);

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold">
        {BADGE_CHECK_COPY.heading}
      </h2>
      <div aria-live="polite" className="flex flex-col gap-3">
        {view.state === 'found' ? (
          <p className="flex items-center gap-2 text-sm font-medium">
            <Check className="size-4 shrink-0" aria-hidden />
            <span>{view.text}</span>
          </p>
        ) : (
          <p className="text-sm">{view.text}</p>
        )}
        {view.action && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={checking} onClick={check}>
              {checking ? (
                <>
                  {BADGE_CHECK_COPY.checking}
                  <ClipLoader loading size={16} color="currentColor" />
                </>
              ) : (
                view.action
              )}
            </Button>
          </div>
        )}
        {view.note && <p className="text-xs text-muted-foreground">{view.note}</p>}
      </div>
    </section>
  );
}
