import Link from 'next/link';
import type { ReactNode } from 'react';

import { LiveRefresh } from './live-refresh';
import { PauseButton } from './pause-button';
import { HEADING } from './primitives';
import type { ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';
import { CONNECT_KEY_PATH } from '@/lib/contribute/contribute-path';
import { type FirstRunStep, firstRunStepOf } from '@/lib/contribute/first-run';
import { dayLabel, KINDS, LANGUAGES, relativeLabel, SIZES, usd } from '@/lib/contribute/format';
import { settingsPathOf } from '@/lib/contribute/settings-paths';

export const WORK_SETTINGS_PATH = settingsPathOf('work');
const LIMITS_SETTINGS_PATH = settingsPathOf('more-limits');

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
          <Link href={CONNECT_KEY_PATH} prefetch={false} className="text-sm font-semibold text-link">
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
          <Link href={LIMITS_SETTINGS_PATH} prefetch={false} className="text-sm font-semibold text-link">
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

/**
 * "We guessed what you'd like": what the picks and the pace start from, as the user's settings have them. Without
 * `spend` (the user's own agent, which spends nothing through us), the picks alone.
 */
export function guessedLineOf(view: ContributeView, { spend = true }: { spend?: boolean } = {}): string {
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
  if (!spend) return `${issues}, ${languages}.`;
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
      className="flex flex-col gap-5 rounded-2xl border border-primary/20 bg-brand-soft/50 p-4.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150 motion-safe:fill-mode-both sm:p-6"
    >
      {step.kind === 'soon' || step.kind === 'no-issues' || step.kind === 'paced' ? <LiveRefresh /> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Heading id="first-run-title" className={Heading === 'h1' ? HEADING.page : HEADING.section}>
          You&apos;re in. Here&apos;s what happens next
        </Heading>
        {yours ? null : <span className="text-xs text-muted-foreground">Nothing for you to do until step 2</span>}
      </div>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <li
          data-step="1"
          className="flex flex-col gap-2 rounded-xl border-2 border-primary bg-background p-4 motion-safe:animate-contribute-glow"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-primary">
            {copy.working ? (
              <span
                aria-hidden="true"
                className="size-3.5 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin"
              />
            ) : null}
            1 · {copy.when}
          </span>
          <span className="font-bold">{copy.title}</span>
          <span className="text-sm text-foreground/80">{copy.text}</span>
          {copy.action ? <div className="flex pt-1 [&>div]:items-start">{copy.action}</div> : null}
        </li>
        {NEXT_STEPS.map(({ when, title, text }, index) => (
          <li key={when} data-step={index + 2} className="flex flex-col gap-2 rounded-xl border bg-background p-4">
            <span className="text-xs font-semibold text-muted-foreground">{when}</span>
            <span className="font-bold">{title}</span>
            <span className="text-sm text-foreground/80">{text}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/20 pt-4 text-sm">
        <span className="text-foreground/80">
          <span className="font-semibold text-foreground">We guessed what you&apos;d like:</span> {guessedLineOf(view)}
        </span>
        <Link href={WORK_SETTINGS_PATH} prefetch={false} className="font-semibold text-link">
          Change it in Settings →
        </Link>
      </div>
    </section>
  );
}
