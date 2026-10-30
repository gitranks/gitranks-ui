import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LiveRefresh } from './live-refresh';
import { PauseButton } from './pause-button';
import type { ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';
import { CONNECT_KEY_PATH } from '@/lib/contribute/contribute-path';
import { type FirstRunStep, firstRunStepOf } from '@/lib/contribute/first-run';
import { dayLabel, KINDS, LANGUAGES, relativeLabel, SIZES, usd } from '@/lib/contribute/format';

export const WORK_SETTINGS_PATH = '/contribute/settings#work' as Route;
const LIMITS_SETTINGS_PATH = '/contribute/settings#limits' as Route;

type StepCopy = { when: string; title: string; text: ReactNode; action?: ReactNode; working?: boolean };

/** Step 1 as the first state that holds tells it: when the agent starts, and what holds it until then. */
export function firstRunCopyOf(step: FirstRunStep, view: ContributeView, now = new Date()): StepCopy {
  const attemptCap = view.contributor?.settings?.attemptCapUsd;
  switch (step.kind) {
    case 'closed':
      return {
        when: 'when Contribute opens',
        title: 'Your agent will start on one of your top picks when Contribute opens',
        text: 'Attempts are switched off during the preview. Your picks are ready, and we start the moment they open.',
      };
    case 'paused':
      return {
        when: 'paused by you',
        title: 'Contributing is paused',
        text: 'No attempt starts until you resume. Your key, limits and picks are kept.',
        action: <PauseButton paused />,
      };
    case 'key-invalid':
      return {
        when: 'once you connect a new key',
        title: 'Your key stopped working',
        text: 'Anthropic refuses the key you connected, so no attempt starts. Connect a new one and your agent starts on one of your top picks.',
        action: (
          <Link href={CONNECT_KEY_PATH} prefetch={false} className="text-sm font-semibold text-primary">
            Connect a new key →
          </Link>
        ),
      };
    case 'key-waiting': {
      const until = step.until ? dayLabel(step.until) : null;
      return {
        when: until ? `on ${until}` : 'once your key can spend again',
        title: until ? `Your agent starts on ${until}` : 'Your agent starts once your key can spend again',
        text:
          step.reason === 'EXHAUSTED'
            ? "Your key's credits are used up until they renew. Nothing is spent beyond them."
            : "Your workspace's spend limit is reached until it resets, or until you raise it in the Claude Console.",
      };
    }
    case 'no-room':
      return {
        when: 'not yet',
        title: 'Your caps leave no room for one attempt',
        text: 'An attempt may spend up to its cap, and no allowance under your caps ever covers one.',
        action: (
          <Link href={LIMITS_SETTINGS_PATH} prefetch={false} className="text-sm font-semibold text-primary">
            Raise them in Settings →
          </Link>
        ),
      };
    case 'paced':
      return {
        when: `starts ${relativeLabel(step.at, now)}`,
        title: `Your agent starts on one of your top picks ${relativeLabel(step.at, now)}`,
        text: 'Pacing saves your credits for later in the month, so it never runs dry early. You can close this page.',
      };
    case 'no-issues':
      return {
        when: 'once there is an issue',
        title: "We're still finding issues for you",
        text: "Your agent starts once there's one. New picks arrive every day.",
        working: true,
      };
    case 'soon':
      return {
        when: 'next, usually within minutes',
        title: 'Your agent starts on one of your top picks',
        text: `On your key, within your per-attempt cap${attemptCap ? ` (${usd(attemptCap)})` : ''}. This page shows it as soon as it starts. You can close this page.`,
        working: true,
      };
  }
}

/** "We guessed what you'd like": what the picks and the pace start from, as the user's settings have them. */
export function guessedLineOf(view: ContributeView): string {
  const preferences = view.contributor?.preferences;
  const settings = view.contributor?.settings;
  const kinds = preferences?.kinds.length
    ? preferences.kinds.map((kind) => KINDS[kind].toLowerCase()).join(', ')
    : null;
  const size = preferences?.maxSize ? `up to ${SIZES[preferences.maxSize].toLowerCase()}` : null;
  const issues =
    kinds || size ? `${kinds ?? 'every kind of issue'}${size ? `, ${size}` : ''}` : 'every kind and size of issue';
  const languages = preferences?.languages.length
    ? `${preferences.languages.map((language) => LANGUAGES[language]).join(', ')} first`
    : "your profile's languages first";
  const cap = settings ? `within your ${usd(settings.cycleCapUsd)} monthly cap` : 'within your monthly cap';
  const pace =
    settings?.pace === 'FAST'
      ? 'as fast as your caps allow'
      : settings?.pace === 'QUEUED'
        ? 'only on issues you queue'
        : 'paced across your cycle';
  return `${issues}, ${languages}, ${cap}, ${pace}.`;
}

/** Steps 2 and 3, the same for every state. */
const NEXT_STEPS = [
  {
    when: "2 · when it's done",
    title: 'You review the change',
    text: 'The diff, the tests it ran and what it cost, at the top of Overview. Submit, send it back, or discard it.',
  },
  {
    when: '3 · when you submit',
    title: 'The PR opens in your name',
    text: 'The first time, GitHub asks you for one permission, so we can fork the repo and open the PR as you.',
  },
];

/**
 * A3, the first-run guide: what happens next for a contributor with a key and no attempt yet, on Issues and
 * Overview. Step 1 says what holds the first attempt, if anything; the page reads itself again while it waits, so
 * the guide gives way to the attempt once it starts. `page` is the feed's first page (`undefined`: not answered).
 */
export function FirstRunGuide({
  view,
  page,
  now,
  heading: Heading = 'h2',
}: {
  view: ContributeView;
  page: ContributeIssuePage | null | undefined;
  now?: Date;
  /** The page's own heading on Issues; under Overview's. */
  heading?: 'h1' | 'h2';
}) {
  const step = firstRunStepOf(view, page, now);
  const copy = firstRunCopyOf(step, view, now);
  const yours = step.kind === 'paused' || step.kind === 'no-room' || step.kind === 'key-invalid';

  return (
    <section
      aria-labelledby="first-run-title"
      data-first-run={step.kind}
      className="flex flex-col gap-5 rounded-[18px] border border-violet-200 bg-violet-50/40 p-[18px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150 motion-safe:fill-mode-both sm:p-6 dark:border-violet-900 dark:bg-violet-950/20"
    >
      {step.kind === 'soon' || step.kind === 'no-issues' || step.kind === 'paced' ? <LiveRefresh /> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Heading id="first-run-title" className="text-[22px] font-extrabold sm:text-2xl">
          You&apos;re in. Here&apos;s what happens next
        </Heading>
        {yours ? null : <span className="text-[13px] text-muted-foreground">Nothing for you to do until step 2</span>}
      </div>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <li
          data-step="1"
          className="flex flex-col gap-2 rounded-[14px] border-2 border-primary bg-background p-4 motion-safe:animate-contribute-glow"
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold text-violet-700 dark:text-violet-300">
            {copy.working ? (
              <span
                aria-hidden="true"
                className="size-3.5 rounded-full border-2 border-violet-200 border-t-primary motion-safe:animate-spin dark:border-violet-900 dark:border-t-primary"
              />
            ) : null}
            1 · {copy.when}
          </span>
          <span className="font-bold">{copy.title}</span>
          <span className="text-sm text-foreground/80">{copy.text}</span>
          {copy.action ? <div className="flex pt-1 [&>div]:items-start">{copy.action}</div> : null}
        </li>
        {NEXT_STEPS.map(({ when, title, text }, index) => (
          <li key={when} data-step={index + 2} className="flex flex-col gap-2 rounded-[14px] border bg-background p-4">
            <span className="text-[13px] font-semibold text-muted-foreground">{when}</span>
            <span className="font-bold">{title}</span>
            <span className="text-sm text-foreground/80">{text}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-100 pt-4 text-sm dark:border-violet-900/60">
        <span className="text-foreground/80">
          <span className="font-semibold text-foreground">We guessed what you&apos;d like:</span> {guessedLineOf(view)}
        </span>
        <Link href={WORK_SETTINGS_PATH} prefetch={false} className="font-semibold text-primary">
          Change it in Settings →
        </Link>
      </div>
    </section>
  );
}
