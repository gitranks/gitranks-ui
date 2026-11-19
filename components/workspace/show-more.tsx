'use client';

import { Button } from '@/components/ui/button';

/**
 * An upcoming list's "Show 10 more" (decision 6), in place: "Showing 10 of 38 issues · Show 10 more"; the last step
 * names the exact number left. Absent once everything shows.
 */
export function ShowMore({
  shown,
  total,
  noun,
  step = 10,
  onMore,
  pending = false,
}: {
  shown: number;
  total: number;
  /** One of what the list holds: "issue". */
  noun: string;
  step?: number;
  onMore: () => void;
  pending?: boolean;
}) {
  if (shown >= total) return null;
  const next = Math.min(step, total - shown);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground" data-show-more={total - shown}>
      <span aria-live="polite">
        Showing {shown} of {total} {total === 1 ? noun : `${noun}s`}
      </span>
      <Button
        type="button"
        variant="outline"
        onClick={onMore}
        disabled={pending}
        className="min-h-10 px-4 font-semibold"
      >
        {pending ? 'Loading…' : `Show ${next} more`}
      </Button>
    </div>
  );
}
