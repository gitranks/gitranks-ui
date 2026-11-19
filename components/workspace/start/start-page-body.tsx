'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import { AgentConnect } from '@/components/workspace/agent/agent-connect';
import { type StartPageCard, StartPageScreen } from '@/components/workspace/start/start-page-screen';
import { resumeContributing } from '@/lib/workspace/actions';
import { changesPollRunning } from '@/lib/workspace/changes-bus';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import type { McpClient } from '@/lib/workspace/mcp-setup';
import {
  learnStartFixOf,
  startClaimOf,
  startPullRequestPathOf,
  startStepsOpen,
  startYoursOf,
} from '@/lib/workspace/start/start-page';
import { readStartPageAttempt, readStartPageIssue } from '@/lib/workspace/start/start-page.actions';
import type { StartMode, StartPageAttempt, StartPageView } from '@/lib/workspace/start/start-page.types';
import { startShownWait } from '@/lib/workspace/start/start-watch';
import { useChanges, useFastChanges } from '@/lib/workspace/use-changes';

export type StartPageBodyProps = {
  /** The issue: `owner/name` and its number. */
  issueRef: { repo: string; issue: number };
  mode: StartMode;
  /**
   * What the page read on the server. Null: nothing was read (a visitor); the body then asks nothing either, and the
   * card draws from `card`.
   */
  view: StartPageView | null;
  /** What the issue card shows when `view` is null, or over the read: a repo, a title, a goal line. */
  card?: StartPageCard;
  /** Drawn before "Connect your agent"; the steps after it are then numbered from 2. */
  firstSection?: ReactNode;
  /** The steps after `firstSection` drawn dimmed and inert, and nothing asked (until the person has signed in). */
  locked?: boolean;
  /** The back link, and every refusal's "back to the issues". */
  backHref: Route;
  backLabel: string;
  /** `flow`: no back link row of its own (the page draws its own step line above). */
  frame: 'tabs' | 'flow';
};

/**
 * The Start page's body, both modes: the issue and its three steps. With a read (`view`) and not `locked`, it follows
 * the issue: once the agent connects it asks again whether the issue can be started, and while it waits it holds the
 * workspace's one poll fast and asks for the viewer's attempt on the issue on each change of their attempts (and when
 * the page is shown again). An attempt opens its pull request's page; in lesson mode a Fix attempt is worded instead.
 * After 30 minutes of the page shown with nothing, it stops and offers Check again. Without a read, or locked, it
 * draws the same page and asks nothing.
 */
export function StartPageBody(props: StartPageBodyProps) {
  const { view, locked = false } = props;
  if (!view || locked) {
    return (
      <StartPageScreen
        issueRef={props.issueRef}
        mode={props.mode}
        issue={view?.issue ?? null}
        card={props.card}
        goal={view?.goal ?? null}
        connection={view?.connection ?? null}
        connect={null}
        fix={null}
        restartHint={view?.restartHint}
        firstSection={props.firstSection}
        locked={locked}
        back={{ href: props.backHref, label: props.backLabel }}
        frame={props.frame}
        now={view ? new Date(view.openedAt) : undefined}
      />
    );
  }
  return <LiveStartPage {...props} view={view} />;
}

/** The refusals the viewer's own attempts clear, which the page asks about again as they move. */
const clearsByItself = (refusal: string | null) => refusal === 'LIMIT_REACHED' || refusal === 'OWN_IN_PROGRESS';

/** The events each mode reports: the page shown, and its move on to the issue's page. */
const EVENTS = {
  fix: { source: 'contribute_start', view: 'contribute_start_view', claimed: 'contribute_start_claimed' },
  lesson: { source: 'learn_start', view: 'learn_start_view', claimed: 'learn_start_claimed' },
} as const;

function LiveStartPage({
  issueRef,
  mode,
  view: initial,
  card,
  firstSection,
  backHref,
  backLabel,
  frame,
}: StartPageBodyProps & { view: StartPageView }) {
  const router = useRouter();
  const { repo, issue: number } = issueRef;
  const [issue, setIssue] = useState(initial.issue);
  const [connection, setConnection] = useState(initial.connection);
  const [fix, setFix] = useState<StartPageAttempt | null>(() => {
    const yours = startYoursOf(initial.issue, mode);
    return yours?.kind === 'fix' ? yours.attempt : null;
  });
  const [timedOut, setTimedOut] = useState(false);
  // A new wait, with its 30 minutes, after each ask of the issue.
  const [round, setRound] = useState(0);
  const [checking, startChecking] = useTransition();
  const [resuming, startResuming] = useTransition();
  const [resumeError, setResumeError] = useState<string | null>(null);
  const gone = useRef(false);
  // The issue as last read, for the repo's spelling in the pull request's address.
  const issueRead = useRef(issue);
  issueRead.current = issue;
  // The router as of the last render: the wait keeps running across renders, whatever object it is.
  const routerRef = useRef(router);
  routerRef.current = router;
  const events = EVENTS[mode];

  useEffect(() => {
    reportLearnEvent({ kind: 'learn_view', event: events.view, source: events.source });
  }, [events]);

  /** The viewer's attempt on the issue: its pull request's page, or (lesson mode, a Fix attempt) the words for it. */
  const onAttempt = useCallback(
    (attempt: StartPageAttempt | null) => {
      const claim = startClaimOf(attempt, mode);
      if (claim?.kind === 'open') {
        if (gone.current) return;
        gone.current = true;
        reportLearnEvent({ kind: 'learn_view', event: events.claimed, source: events.source });
        // In place of this page: Back returns to the list, not to a page that would move on again.
        routerRef.current.replace(startPullRequestPathOf({ repo, issue: number }, issueRead.current));
        return;
      }
      setFix(claim?.kind === 'fix' ? claim.attempt : null);
    },
    [mode, events, repo, number],
  );

  const askIssue = useCallback(
    () =>
      startChecking(async () => {
        // Offline, or a deploy under way: the page stays as it was, and the wait starts again.
        const result = await readStartPageIssue(repo, number, mode).catch(() => null);
        if (result?.ok) {
          setIssue(result.data);
          issueRead.current = result.data;
          onAttempt(result.data.start.refusal === 'YOURS' ? result.data.start.attempt : null);
        }
        setTimedOut(false);
        setRound((count) => count + 1);
      }),
    [repo, number, mode, onAttempt],
  );

  const askAttempt = useCallback(async () => {
    const result = await readStartPageAttempt(repo, number).catch(() => null);
    if (result?.ok) onAttempt(result.data);
  }, [repo, number, onAttempt]);

  const onConnected = useCallback(
    (client: McpClient) => {
      setConnection({ client, lastCallAt: new Date().toISOString() });
      askIssue();
    },
    [askIssue],
  );

  const onResume = useCallback(
    () =>
      startResuming(async () => {
        setResumeError(null);
        const result = await resumeContributing().catch(() => null);
        if (result?.ok) askIssue();
        else setResumeError(contributeErrorMessage(result?.error ?? 'FAILED', result?.message));
      }),
    [askIssue],
  );

  // Nothing to wait for once the agent's regular pull request is open: the page says to pick another issue.
  const fixDone = !!fix && learnStartFixOf(fix.state).pickAnother;
  const waits = startStepsOpen(issue) && (!!connection || !!fix) && !fixDone && !timedOut;
  useFastChanges(waits);
  useChanges(['ATTEMPTS'], () => void askAttempt(), waits);
  // A refusal the viewer's own attempts clear (a run ends, a lesson is done, a pull request closes): asked again on each
  // change of their attempts, and the steps come back once it no longer holds.
  useChanges(['ATTEMPTS'], askIssue, clearsByItself(issue.start.refusal));
  // biome-ignore lint/correctness/useExhaustiveDependencies: `round` starts a new wait after each ask of the issue.
  useEffect(() => {
    if (!waits) return;
    const wait = startShownWait(
      {
        onTimeout: () => setTimedOut(true),
        onShown: () => void askAttempt(),
        // No poll in this tab (a page reached from one without the tabs): the wait asks by itself.
        onTick: () => {
          if (!changesPollRunning()) void askAttempt();
        },
      },
      { document },
    );
    return wait.stop;
  }, [waits, round, askAttempt]);

  const { agent } = initial;
  return (
    <StartPageScreen
      issueRef={issueRef}
      mode={mode}
      issue={issue}
      card={card}
      goal={initial.goal}
      connection={connection}
      connect={
        // The embedded connect steps: no title or back link of their own, and the page goes on in place.
        <AgentConnect
          embedded
          onboarded={agent.onboarded}
          tokens={agent.tokens}
          signIn={agent.signIn}
          openedAt={initial.openedAt}
          onConnected={onConnected}
          connectSource={events.source}
        />
      }
      fix={fix}
      restartHint={initial.restartHint}
      timedOut={timedOut}
      checking={checking}
      onCheckAgain={askIssue}
      resuming={resuming}
      onResume={onResume}
      resumeError={resumeError}
      firstSection={firstSection}
      back={{ href: backHref, label: backLabel }}
      frame={frame}
      now={new Date(initial.openedAt)}
    />
  );
}
