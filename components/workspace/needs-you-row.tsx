import Link from 'next/link';

import { LiveRunPhase } from './agent/agent-runs';
import { LearnPill } from './learn-pill';
import { CopyAndOpenLink, MarkHandledButton } from './pull-request/follow-up-buttons';
import { RefChips } from './ref-chips';
import { Pill } from '@/components/pill/pill';
import { cn } from '@/lib/utils';
import type { ContributeActivity } from '@/lib/workspace/contribute.types';
import {
  keyWhereOf,
  type NeedsYouButton,
  type NeedsYouEntry,
  type NeedsYouWords,
} from '@/lib/workspace/needs-you-words';

/** The row's button: full width under the row on a phone; one primary per view, the others outline. */
const ROW_ACTION =
  'inline-flex min-h-10 flex-none items-center justify-center rounded-lg px-3.5 text-sm font-semibold max-sm:min-h-11 max-sm:w-full';
const ROW_ACTION_TONES = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border bg-background hover:bg-muted',
};

/** The one button: a page of ours, GitHub, or GitHub with the comment to post copied first. */
function RowButton({ action, primary }: { action: NeedsYouButton; primary: boolean }) {
  const className = cn(ROW_ACTION, ROW_ACTION_TONES[primary ? 'primary' : 'outline']);
  if ('href' in action) {
    return (
      <Link href={action.href} prefetch={false} aria-label={action.aria} className={className}>
        {action.label}
      </Link>
    );
  }
  if (action.copy) {
    return (
      <CopyAndOpenLink
        href={action.external}
        copy={action.copy}
        label={action.label}
        ariaLabel={action.aria}
        className={className}
      />
    );
  }
  return (
    <a href={action.external} target="_blank" rel="noopener noreferrer" aria-label={action.aria} className={className}>
      {action.label}
    </a>
  );
}

/** The button, and the small second action under it ("I've done it", "Keep it open"). */
function RowActions({ words, primary }: { words: NeedsYouWords; primary: boolean }) {
  const { action, secondary } = words;
  if (!action && !secondary) return null;
  return (
    <span className="flex flex-none flex-col items-end gap-1 max-sm:w-full max-sm:items-stretch">
      {action ? <RowButton action={action} primary={primary} /> : null}
      {!secondary ? null : 'href' in secondary ? (
        <Link
          href={secondary.href}
          prefetch={false}
          className="inline-flex min-h-6 items-center self-end text-xs font-semibold text-link hover:underline max-sm:min-h-11 max-sm:self-start"
        >
          {secondary.label}
        </Link>
      ) : (
        <MarkHandledButton
          prId={secondary.handled.prId}
          prNumber={secondary.handled.prNumber}
          kinds={secondary.handled.kinds}
          all={secondary.handled.all}
          label={secondary.label}
          look="link"
        />
      )}
    </span>
  );
}

/** What a row is about: the repo and the chips to GitHub, the Learn pill on a Learn item, then its own pill. */
function RowRefs({ entry, words }: { entry: NeedsYouEntry; words: NeedsYouWords }) {
  const where = keyWhereOf(entry);
  const pills = (
    <>
      {entry.side === 'learn' ? <LearnPill /> : null}
      <Pill tone={words.tone}>{words.pill}</Pill>
    </>
  );
  if (where) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{where}</span>
        {pills}
      </span>
    );
  }
  return (
    <RefChips repo={entry.repo} issue={entry.issueNumber} pr={entry.pullRequest}>
      {pills}
    </RefChips>
  );
}

/**
 * One row of Needs you: what it is about, the issue's title, "Your move:" and one sentence, and one button (`primary`
 * for the first row of the view). "and 2 more" when more wait on the same pull request. Stacked on a phone, the button
 * full width.
 */
export function NeedsYouRow({
  entry,
  words,
  primary,
}: {
  entry: NeedsYouEntry;
  words: NeedsYouWords;
  primary: boolean;
}) {
  return (
    <li
      data-row={entry.kind}
      data-side={entry.side}
      className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-b-0"
    >
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1">
        <RowRefs entry={entry} words={words} />
        {entry.title ? <span className="font-medium">{entry.title}</span> : null}
        <span className="text-sm break-words text-foreground/80">
          <span className="font-semibold text-foreground">Your move: </span>
          {words.move}
          {entry.more ? <span className="text-muted-foreground"> · and {entry.more} more</span> : null}
        </span>
      </div>
      <RowActions words={words} primary={primary} />
    </li>
  );
}

/**
 * One row of In progress: what it is about, the title, one line (when it started and its spend, the submission's step,
 * the user's own agent's hold; the live phase from the poll while an agent works), and "Details" or "Watch run 2".
 */
export function InProgressRow({
  entry,
  words,
  activity,
}: {
  entry: NeedsYouEntry;
  words: NeedsYouWords;
  activity?: ContributeActivity | null;
}) {
  const line = <span className="text-xs text-muted-foreground">{words.move}</span>;
  return (
    <li
      data-row={entry.kind}
      data-side={entry.side}
      className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-b-0"
    >
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1">
        <RowRefs entry={entry} words={words} />
        {entry.title ? <span className="font-medium">{entry.title}</span> : null}
        {entry.kind === 'attempt-working' && entry.attemptId ? (
          <span className="text-xs text-muted-foreground">
            <LiveRunPhase attemptId={entry.attemptId} activity={activity}>
              {words.move}
            </LiveRunPhase>
          </span>
        ) : (
          line
        )}
      </div>
      <RowActions words={words} primary={false} />
    </li>
  );
}
