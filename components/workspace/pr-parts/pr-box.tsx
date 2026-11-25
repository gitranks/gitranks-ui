'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/workspace/copy-button';
import { EnterKey } from '@/components/workspace/masked-issue/facts';
import { useEnterKey } from '@/components/workspace/masked-issue/use-enter-key';
import { MoreWaiting, moreWaitingOf, useRowFocus } from '@/components/workspace/pr-parts/more-waiting';
import { SendKey, useSendKey, useSendKeyName } from '@/components/workspace/pr-parts/send-key';
import { cn } from '@/lib/utils';
import type { WalkthroughSendBack } from '@/lib/workspace/blocked-walkthrough';
import {
  type BoxAction,
  type BoxActionId,
  boxOf,
  boxRoundOf,
  OUTCOME_WORDS,
  openingStepOf,
  type PullRequestLinks,
} from '@/lib/workspace/pull-request-page';
import type { PullRequestOutcome, PullRequestPage } from '@/lib/workspace/pull-request-page.types';

/** What the box's buttons do: the page sends each press to the API. */
export type PullRequestBoxPresses = {
  onStartRound?: (round: number) => void;
  onSendRound?: (round: number) => void;
  onSendBack?: () => void;
  onRetry?: () => void;
  /** Autopilot is about to send it: "Don't send it". */
  onVeto?: () => void;
  /** Something only the person can do and that the page does itself (sign off and push, rename, allow access). */
  onOnlyYou?: (kind: string, which: 'main' | 'alt') => void;
};

export type PullRequestBoxProps = PullRequestBoxPresses & {
  page: PullRequestPage;
  now: Date;
  links?: PullRequestLinks;
  /** The agent's name when known ("Claude Code"); "your agent" otherwise. */
  agent?: string | null;
  /** A hosted round stopped at the person's limit: "Try again", or finish it by hand on GitHub. */
  stoppedAtLimit?: boolean;
  /** A walkthrough of an older version waits for another pass by the person's agent: why, when known. */
  walkthroughBlocked?: { reason: string | null; sendBack?: WalkthroughSendBack } | null;
  /** A press went through and waits for the API: the buttons wait. */
  pending?: boolean;
  /** Enter does the main action (the page's one Enter key); a round's send takes Ctrl + Enter, as Approve does. */
  enterKey?: boolean;
  /** "N more waiting" drawn opened (the catalogue). */
  initialMoreOpen?: boolean;
};

/** The actions that lead to one of the page's links. */
const LINKED: Partial<Record<BoxActionId, keyof PullRequestLinks>> = {
  walkthrough: 'walkthrough',
  approve: 'approve',
  lessonQuestions: 'lessonQuestions',
  lessonIssues: 'lessonIssues',
  course: 'course',
  similar: 'similar',
  issues: 'issues',
};

type Shown = { action: BoxAction; href?: Route; external?: string; onPress?: () => void };

/** Each action with what it does; an action the page gives no link or press for is left out. */
function shownOf(
  actions: BoxAction[],
  { page, links = {}, ...presses }: Pick<PullRequestBoxProps, 'page' | 'links'> & PullRequestBoxPresses,
): Shown[] {
  const round = boxRoundOf(page);
  const kind = page.onlyYou[0]?.kind ?? '';
  const pressOf: Partial<Record<BoxActionId, (() => void) | undefined>> = {
    startRound: presses.onStartRound && (() => presses.onStartRound?.(round)),
    sendRound: presses.onSendRound && (() => presses.onSendRound?.(round)),
    sendBack: presses.onSendBack,
    retry: presses.onRetry,
    veto: presses.onVeto,
    onlyYou: presses.onOnlyYou && (() => presses.onOnlyYou?.(kind, 'main')),
    onlyYouAlt: presses.onOnlyYou && (() => presses.onOnlyYou?.(kind, 'alt')),
  };
  return actions.flatMap((action): Shown[] => {
    if (action.url) return [{ action, external: action.url }];
    const link = LINKED[action.id];
    if (link) {
      const href = links[link];
      return href ? [{ action, href }] : [];
    }
    const onPress = pressOf[action.id];
    return onPress ? [{ action, onPress }] : [];
  });
}

const MAIN = 'h-10 px-6 font-semibold max-sm:min-h-11';
const OTHER = 'h-9 px-4 max-sm:min-h-11';

function ActionButton({
  shown,
  main,
  pending,
  sendKey,
}: {
  shown: Shown;
  main: boolean;
  pending: boolean;
  /** The main action sends a round: its key is Ctrl + Enter (named so), not Enter. */
  sendKey: string | null;
}) {
  const variant = main ? 'default' : 'outline';
  const className = main ? MAIN : OTHER;
  const data = main ? { 'data-main': '' } : {};
  const label = (
    <>
      {shown.action.label}
      {shown.external ? <span aria-hidden="true">↗</span> : null}
      {main ? sendKey ? <SendKey name={sendKey} /> : <EnterKey /> : null}
    </>
  );
  if (shown.external) {
    return (
      <Button asChild variant={variant} className={className}>
        <a href={shown.external} target="_blank" rel="noopener noreferrer" {...data}>
          {label}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Button>
    );
  }
  if (shown.href) {
    return (
      <Button asChild variant={variant} className={className}>
        <Link href={shown.href} prefetch={false} {...data}>
          {label}
        </Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} className={className} disabled={pending} onClick={shown.onPress} {...data}>
      {label}
    </Button>
  );
}

/** Opening the pull request: a bar in five parts, and one line that names the part. */
function OpeningBar({ step }: { step: number | null }) {
  const at = openingStepOf(step);
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5" data-opening="">
      <span className="flex items-center gap-1" role="img" aria-label={`Step ${at.step} of ${at.of}`}>
        {Array.from({ length: at.of }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              'h-1.5 w-10 rounded-full sm:w-13',
              index + 1 < at.step ? 'bg-primary' : index + 1 === at.step ? 'bg-primary/45' : 'bg-muted',
            )}
          />
        ))}
      </span>
      <span className="text-sm text-muted-foreground">{at.line}</span>
    </span>
  );
}

/** The round's prompt for the person's own agent, with the one button that copies it. */
function PromptToCopy({ prompt }: { prompt: string }) {
  return (
    <div className="dark flex w-full flex-col gap-3 rounded-xl bg-background p-3 text-foreground ring-1 ring-border sm:flex-row sm:items-center sm:ps-4">
      <code className="min-w-0 flex-1 font-mono text-sm break-words" data-prompt="">
        {prompt}
      </code>
      <span className="contents" data-main="">
        <CopyButton text={prompt} label="Copy" variant="default" className={MAIN} />
      </span>
    </div>
  );
}

/**
 * The box: where the pull request stands and the one thing to do, in every state of the page. Its parts keep their
 * places: the title, one line, then the actions' row (the main action filled, with the Enter key), a quiet note when
 * nothing is needed, the bar while the pull request opens, or the prompt to copy while a round waits; last, "N more
 * waiting" when other things only the person can do wait too. An end without a merge is drawn grey and dashed.
 */
export function PullRequestBox({
  page,
  now,
  links,
  agent,
  stoppedAtLimit = false,
  walkthroughBlocked = null,
  pending = false,
  enterKey = true,
  initialMoreOpen = false,
  ...presses
}: PullRequestBoxProps) {
  const words = boxOf(page, { agent, now, stoppedAtLimit, walkthroughBlocked });
  const shown = shownOf(words.actions, { page, links, ...presses });
  const actions = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLElement>(null);
  const rest = moreWaitingOf(page);
  const onFocus = useRowFocus(box, rest, pending);
  const keyName = useSendKeyName();
  // The main action: the first one, never "Don't send it", which only stops what is under way.
  const mainOf = (each: Shown, index: number) => index === 0 && each.action.id !== 'veto';
  // Sending a round goes to GitHub as a whole: Ctrl + Enter, as on Approve; Enter alone does nothing then.
  const sendRound = shown.find((each, index) => mainOf(each, index) && each.action.id === 'sendRound');
  const hasMain = enterKey && !sendRound && (shown.some(mainOf) || !!words.prompt);
  useSendKey(enterKey && sendRound?.onPress && !pending ? sendRound.onPress : null);
  useEnterKey(
    hasMain
      ? () => {
          const main = actions.current?.querySelector<HTMLElement>('[data-main]');
          (main?.matches('a, button') ? main : main?.querySelector<HTMLElement>('a, button'))?.click();
        }
      : null,
  );

  let row: ReactNode = null;
  if (words.prompt) row = <PromptToCopy prompt={words.prompt} />;
  else if (shown.length) {
    row = shown.map((each, index) => (
      <ActionButton
        key={each.action.id}
        shown={each}
        main={mainOf(each, index)}
        pending={pending}
        sendKey={each === sendRound ? keyName : null}
      />
    ));
  } else if (words.note) row = <span className="text-sm text-muted-foreground">{words.note}</span>;

  return (
    <section
      ref={box}
      onFocus={onFocus}
      aria-live="polite"
      className={cn(
        'flex flex-col gap-2 rounded-2xl border bg-card p-5',
        words.quiet ? 'border-dashed' : 'border-primary shadow-[inset_0_0_0_1px_var(--primary)]',
      )}
      data-box={page.box}
    >
      <h2 className={cn('m-0 text-lg font-semibold text-pretty', words.quiet && 'text-muted-foreground')}>
        {words.title}
      </h2>
      <p className="m-0 min-h-10 max-w-[72ch] text-sm text-muted-foreground">
        {words.text}
        {words.textLink ? (
          <>
            {' '}
            <a
              className="font-semibold text-link hover:underline"
              href={words.textLink.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {words.textLink.label} <span aria-hidden="true">↗</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </>
        ) : null}
      </p>
      {page.box === 'OPENING' ? <OpeningBar step={page.openingStep} /> : null}
      <div ref={actions} className="flex min-h-11 flex-wrap items-center gap-3 pt-1.5" data-box-actions="">
        {row}
      </div>
      {rest.length ? (
        <MoreWaiting items={rest} onOnlyYou={presses.onOnlyYou} pending={pending} initialOpen={initialMoreOpen} />
      ) : null}
    </section>
  );
}

/** One line under the box about what became of the pull request: no answer for a while, or the project said stop. */
export function PullRequestOutcomeLine({ outcome }: { outcome: PullRequestOutcome | null }) {
  if (!outcome) return null;
  return (
    <p className="m-0 text-sm text-muted-foreground" data-outcome={outcome}>
      {OUTCOME_WORDS[outcome]}
    </p>
  );
}
