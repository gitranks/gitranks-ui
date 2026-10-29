import Link from 'next/link';
import type { ReactNode } from 'react';

import { Eyebrow } from './primitives';
import { ProviderCards } from './provider-cards';
import { CONTACT_EMAIL } from '@/lib/legal';

const STEPS = [
  {
    title: 'Connect your key',
    text: 'A Claude API key from a workspace with its own spend limit. Your credits pay; we never see your bill.',
  },
  {
    title: 'We pick issues',
    text: 'From active repos that merge outside work, matched to the languages and topics on your profile.',
  },
  {
    title: 'An agent works, you review',
    text: 'You see the diff, the tests it ran and what it cost. Submit it, ask for changes, or discard it.',
  },
  {
    title: 'The PR is yours',
    text: 'Opened from your fork, in your name, co-authored by gitranks. We tell you when maintainers reply.',
  },
];

const PROMISES = [
  {
    title: 'Your limits, all of them',
    text: 'Monthly, weekly, daily and per-attempt caps, the models, PR size, pacing across your billing cycle. Change any of them any time.',
  },
  {
    title: 'You review first',
    text: 'Every PR waits for your OK. Autopilot unlocks after three of your PRs are merged, if you want it.',
  },
  {
    title: 'Leave whenever you like',
    text: 'Remove your key and the GitHub access in Settings. Your merged PRs stay yours.',
  },
];

function Dot() {
  return <span aria-hidden="true" className="size-1.5 rounded-full bg-green-700" />;
}

function ExampleCard({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 rounded-xl border bg-card px-5 py-4 shadow-xs">{children}</div>;
}

/** The pitch: the contribution first, the job benefit second; how it works; providers; limits; maintainers. */
export function Landing({ status }: { status?: ReactNode }) {
  return (
    <div className="flex flex-col">
      {status ? <div className="mx-auto w-full max-w-7xl px-4 pt-6">{status}</div> : null}

      <section className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-14 px-4 pt-12 pb-16 md:pt-14">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
          <Eyebrow className="text-violet-700 dark:text-violet-300">Contribute</Eyebrow>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-balance md:text-[54px]">
            Invest your unused AI credits in open source
          </h1>
          <p className="max-w-xl text-lg text-foreground/80">
            Claude Max and Team plans include monthly API credits that expire unused. Put them toward real fixes in
            open-source projects, on issues maintainers want solved. An agent works on your own key, you review every
            change, and the pull request opens in your name. Each one is a small investment in the software everyone
            depends on, and in the future of programming.
          </p>
          <p className="max-w-xl text-muted-foreground">
            It adds up for you too. Merged pull requests stay on your public record, and that footprint often opens the
            door to your next job.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contribute/connect"
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Connect Claude
            </Link>
            <a
              href="#how"
              className="inline-flex min-h-11 items-center rounded-lg border px-4 font-medium hover:bg-accent"
            >
              How it works
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Dot />
              You set every limit
            </li>
            <li className="flex items-center gap-2">
              <Dot />
              Nothing reaches GitHub without your OK
            </li>
            <li className="flex items-center gap-2">
              <Dot />
              Revoke any time
            </li>
          </ul>
        </div>

        <figure
          aria-label="Example: from an issue to a merged pull request"
          className="m-0 flex min-w-0 flex-[1_1_440px] flex-col gap-3.5"
        >
          <ExampleCard>
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="font-mono">fern-lang/fern · #2481</span>
              <span>picked for you</span>
            </div>
            <span className="font-semibold">Formatter drops a trailing comment in match arms</span>
            <div className="flex flex-wrap gap-1.5 text-xs font-medium">
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-950 dark:text-green-300">
                good first issue
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">bug</span>
              <span className="rounded-full bg-muted px-2 py-0.5">Rust</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Why: you write Rust, and you've contributed to fern-lang/fern-lsp
            </span>
          </ExampleCard>
          <div aria-hidden="true" className="flex items-center gap-2.5 pl-5 font-mono text-xs text-muted-foreground">
            <span className="h-8 w-0.5 bg-violet-200 dark:bg-violet-900" />
            agent on your key · you review · you submit
          </div>
          <ExampleCard>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#8250df] px-2.5 py-0.5 text-xs font-semibold text-white">Merged</span>
              <span className="text-sm text-muted-foreground">3 days after you submitted</span>
            </div>
            <span className="font-semibold">Keep trailing comments when formatting match arms</span>
            <div className="flex flex-wrap gap-4 font-mono text-sm">
              <span>
                <span className="text-green-700 dark:text-green-400">+18</span>{' '}
                <span className="text-red-700 dark:text-red-400">−3</span>
              </span>
              <span className="text-muted-foreground">2 files</span>
              <span className="text-muted-foreground">$1.84 of your credits</span>
            </div>
          </ExampleCard>
        </figure>
      </section>

      <section id="how" className="scroll-mt-16 border-y bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ title, text }, index) => (
              <li key={title} className="flex min-w-0 flex-col gap-2.5">
                <span className="font-mono text-sm text-violet-700 dark:text-violet-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[17px] font-semibold">{title}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Bring the allowance you already pay for</h2>
          <p className="max-w-2xl text-muted-foreground">
            Claude works today. Tell us which one you want next and we'll let you know when it's ready.
          </p>
        </div>
        <ProviderCards />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16">
        <div className="grid gap-3.5 md:grid-cols-3">
          {PROMISES.map(({ title, text }) => (
            <div key={title} className="flex min-w-0 flex-col gap-2 rounded-xl bg-muted/50 p-5">
              <span className="text-[17px] font-semibold">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pt-9 pb-14">
          <p className="max-w-3xl text-muted-foreground">
            <span className="font-semibold text-foreground">Maintain a repo?</span> We open at most one PR in it at a
            time, never more than four a month, and pause after two are closed in a row. Every PR says it was made with
            AI.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Opt%20out%20of%20GitRanks%20Contribute`}
            className="font-semibold text-primary"
          >
            Opt out your repo →
          </a>
        </div>
      </section>
    </div>
  );
}
