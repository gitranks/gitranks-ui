'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setPrTimeline } from '../actions';
import { Button } from '@/components/ui/button';
import { prTimelinePath } from '@/lib/contribute/pr-timeline-path';

type Props = {
  attemptId: string;
  nameWithOwner: string;
  number: number;
  /** The switch: on, off, or null for a PR approved before it existed ("Off"). */
  shown: boolean | null;
};

/**
 * The contribution page's line for a PR that can have a public timeline: its state, a link to the page while it shows,
 * and Hide or Show. Hidden here, the page is gone at once from this site; the edge drops its copy within minutes.
 */
export function PrTimelineLine({ attemptId, nameWithOwner, number, shown: initial }: Props) {
  const router = useRouter();
  const [shown, setShown] = useState(initial === true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const flip = () =>
    startTransition(async () => {
      setError(null);
      const result = await setPrTimeline({ attemptId, shown: !shown, nameWithOwner, number });
      if (!result.ok) {
        setError(result.message ?? 'The page could not be changed. Try again.');
        return;
      }
      setShown(result.data.shown);
      router.refresh();
    });

  return (
    <div
      data-pr-timeline={shown ? 'shown' : 'hidden'}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4.5 py-3 text-sm"
    >
      <span className="font-semibold">Public timeline</span>
      <span className="text-muted-foreground">{shown ? 'Shown' : initial === null ? 'Off' : 'Hidden'}</span>
      {shown ? (
        <Link
          href={prTimelinePath({ nameWithOwner, number })}
          prefetch={false}
          className="font-medium text-link hover:underline"
        >
          View
        </Link>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={flip} disabled={pending} className="ml-auto">
        {shown ? 'Hide' : 'Show'}
      </Button>
      {error ? (
        <span role="alert" className="w-full text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
