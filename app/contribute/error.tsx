'use client';

import Link from 'next/link';

/** A Contribute page that could not load its data: an outage, never "not found". */
export default function ContributeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-4 pt-12 pb-16">
      <h1 className="text-[28px] font-bold tracking-tight">Contribute did not load</h1>
      <p className="text-muted-foreground">Your data is safe; we could not read it just now. Try again in a minute.</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <Link href="/" prefetch={false} className="text-sm font-semibold text-primary">
          Back to GitRanks
        </Link>
      </div>
    </main>
  );
}
