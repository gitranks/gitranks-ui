'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { HEADING } from '@/components/workspace/primitives';

type ErrorProps = { error: Error & { digest?: string }; reset: () => void };

/** A page that could not load its data: an outage, never "not found". Its heading and line, then "Try again". */
function TryAgain({ reset, title, text }: { reset: () => void; title: string; text: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-4 pt-12 pb-16">
      <h1 className={HEADING.page}>{title}</h1>
      <p className="text-muted-foreground">{text}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={reset} className="min-h-11 px-5 font-semibold">
          Try again
        </Button>
        <Link href="/" prefetch={false} className="text-sm font-semibold text-link">
          Back to GitRanks
        </Link>
      </div>
    </main>
  );
}

/** A Contribute page, or a workspace page under `/my`, that could not load its data. */
export function ContributeError({ reset }: ErrorProps) {
  return (
    <TryAgain
      reset={reset}
      title="Contribute did not load"
      text="Your data is safe; we could not read it just now. Try again in a minute."
    />
  );
}

/** A Learn page that could not load its data. */
export function LearnError({ reset }: ErrorProps) {
  return (
    <TryAgain
      reset={reset}
      title="This page did not load"
      text="Your progress is safe; we could not read it just now. Try again in a minute."
    />
  );
}

/** A player's page under `/my`, which both products open, that could not load its data: it names neither. */
export function SharedPageError({ reset }: ErrorProps) {
  return (
    <TryAgain
      reset={reset}
      title="This page did not load"
      text="Your work is safe; we could not read it just now. Try again in a minute."
    />
  );
}
