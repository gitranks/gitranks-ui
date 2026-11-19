'use client';

import { Button } from '@/components/ui/button';

/** The Start page could not read its issue: an outage, never "not found". */
export default function StartPageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col items-start gap-3 px-4 pt-12 pb-16">
      <p className="text-muted-foreground" role="status">
        Couldn&apos;t load this issue. Try again in a minute.
      </p>
      <Button type="button" onClick={reset} className="min-h-11 px-5 font-semibold">
        Try again
      </Button>
    </main>
  );
}
