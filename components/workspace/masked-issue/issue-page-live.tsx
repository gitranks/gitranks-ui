'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AgentConnect } from '@/components/workspace/agent/agent-connect';
import { sendFairUseAppeal } from '@/components/workspace/fair-use-appeal-live';
import { type IssuePageNotice, IssuePageScreen } from '@/components/workspace/masked-issue/issue-page-screen';
import type { ContributeActionResult } from '@/lib/workspace/errors';
import { clearHeldMark, writeHeldMark } from '@/lib/workspace/held-mark';
import { type IssuePageLearn, issueLessonLineOf } from '@/lib/workspace/issue-page-learn';
import { limitWordsOf } from '@/lib/workspace/limit-words';
import { type IssuePageFrom, issuePageHrefOf } from '@/lib/workspace/masked-issue';
import {
  extendIssueLook,
  giveBackIssue,
  lookAtIssue,
  lookOnReturn,
  readIssuePage,
  saveIssueOutNote,
  setIssueOutReason,
  startHeldIssue,
} from '@/lib/workspace/masked-issue.actions';
import type { IssueStartReads } from '@/lib/workspace/masked-issue.data';
import type {
  IssueLooked,
  IssueLookOutcome,
  IssueNumbers,
  IssuePage,
  IssuePageState,
} from '@/lib/workspace/masked-issue.types';
import { MCP_CLIENT_NAMES, type McpClient } from '@/lib/workspace/mcp-setup';
import { issueStartRefusalOf } from '@/lib/workspace/start-refusals';
import { useChanges, useFastChanges } from '@/lib/workspace/use-changes';

/** The page a refused press turns to, when the API answers the outcome without a page. */
const OUTCOME_STATES: Partial<Record<IssueLookOutcome, IssuePageState>> = {
  TAKEN: 'TAKEN',
  LIMIT: 'LIMIT',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  LEFT_POOL: 'LEFT_POOL',
};

/** The words of a press that did not go through: the page stays as it was. */
export const ISSUE_PAGE_NOTICES = {
  look: 'The issue did not open. Try again in a minute.',
  giveBack: 'The issue was not given back. Try again in a minute.',
  hosted: 'The hosted agent did not start. Try again in a minute.',
} as const;

/** A hosted start's refusal that ends the page, as a look's would. */
const START_REFUSAL_STATES: Partial<Record<string, IssuePageState>> = { TAKEN: 'TAKEN', CLOSED: 'LEFT_POOL' };

export type IssuePageLiveProps = {
  /** The issue's mask id. */
  id: string;
  /** The page as the server read it. */
  page: IssuePage;
  from: IssuePageFrom;
  back: { href: Route; label: string };
  /** From Learn: the query of the Issues view the person came from, kept in the address for the way back. */
  view?: string | null;
  numbers: IssueNumbers | null;
  /** When the server rendered the page: the hold's clock starts there. */
  openedAt: string;
  /** The hosted agent is set up (a Claude key stored). */
  hosted: boolean;
  /** The start form's reads: the own agent, its connect steps, the pull requests that wait. */
  start: IssueStartReads;
  /** From Contribute: the person also uses Learn (they have a Learn profile). */
  alsoLearn: boolean;
  /** Back from the sign-in with a press made before it (`?look=1`): the press is made now, once. */
  returning: boolean;
  /**
   * From Learn: Learn's parts, read on their own (the lesson and why, kept for learners, how the work started). Null or
   * left out, the page draws none of them.
   */
  learn?: IssuePageLearn | null;
};

/**
 * The page of one issue, live: "See the full issue" holds it and shows it in full in place, "Give it back" turns the
 * page to the reasons and the note, each saved as it is pressed. Copying the prompt, or "I added it" in the connect
 * steps, holds the issue 30 minutes, once; the page then waits for the agent to start and moves on to the work's page,
 * as it does from the start when the page opens in full with the person's agent connected. A press that does not go
 * through leaves the page as it was and says so; a hosted start that is refused says why.
 */
export function IssuePageLive(props: IssuePageLiveProps) {
  const { id, from, view = null } = props;
  const router = useRouter();
  const [page, setPage] = useState(props.page);
  const [pressing, setPressing] = useState(false);
  const [givingBack, setGivingBack] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [notice, setNotice] = useState<IssuePageNotice | null>(null);
  const [hostedSending, setHostedSending] = useState(false);
  const [connection, setConnection] = useState(props.start.connection);
  // A page opened in full with the person's agent connected (a reload) waits for the agent at once.
  const [waiting, setWaiting] = useState(props.page.state === 'FULL' && !!props.start.connection);
  const routerRef = useRef(router);
  routerRef.current = router;

  // The browser's mark of the issue held open, for the lists: written when a look starts or is held longer (and for
  // another issue the page says is held), cleared once this one is given back, started, ended or seen past.
  useEffect(() => {
    if (page.state === 'FULL' && page.until) writeHeldMark({ id, until: page.until });
    else if (page.holding) writeHeldMark(page.holding);
    if (page.state !== 'FULL' && page.state !== 'MASKED') clearHeldMark(id);
  }, [id, page.state, page.until, page.holding]);

  /** The page after a press: in full, one of the ends, or the closed access. */
  const onLooked = useCallback((result: ContributeActionResult<IssueLooked>) => {
    if (!result.ok) {
      setNotice({ text: ISSUE_PAGE_NOTICES.look });
      return;
    }
    const { outcome, page: next } = result.data;
    if (outcome === 'SUSPENDED') {
      setSuspended(true);
      return;
    }
    if (next) setPage(next);
    else {
      const state = OUTCOME_STATES[outcome];
      if (state) setPage((current) => ({ ...current, state }));
    }
  }, []);

  const see = useCallback(async () => {
    setPressing(true);
    setNotice(null);
    const result = await lookAtIssue(id, from).catch(() => null);
    onLooked(result ?? { ok: false, error: 'FAILED' });
    setPressing(false);
  }, [id, from, onLooked]);

  // Back from the sign-in: the press made before it, once, and the address without it (a reload makes no second one).
  // The sign-in's mark is used up either way; the press is made only while the details are still hidden.
  const returned = useRef(false);
  useEffect(() => {
    if (!props.returning || returned.current) return;
    returned.current = true;
    routerRef.current.replace(issuePageHrefOf(id, from, false, view));
    const masked = props.page.state === 'MASKED';
    if (masked) setPressing(true);
    void lookOnReturn(id, from, masked)
      .catch(() => null)
      .then((result) => {
        if (result) onLooked(result);
        if (masked) setPressing(false);
      });
  }, [props.returning, props.page.state, id, from, view, onLooked]);

  /** The page read again: once the agent started, on to the work's page. */
  const ask = useCallback(async () => {
    const result = await readIssuePage(id).catch(() => null);
    if (!result?.ok || !result.data) return;
    const next = result.data;
    if (next.state === 'STARTED' && next.startPath) {
      clearHeldMark(id);
      routerRef.current.replace(next.startPath as Route);
      return;
    }
    setPage(next);
  }, [id]);

  // Waiting for the agent: the workspace's poll runs fast, and each change of the person's attempts asks again.
  useFastChanges(waiting);
  useChanges(['ATTEMPTS'], () => void ask(), waiting);

  /** The issue held 30 minutes, once; then the page waits for the agent. */
  const holdLonger = useCallback(async () => {
    setWaiting(true);
    const result = await extendIssueLook(id).catch(() => null);
    if (result?.ok) setPage(result.data);
  }, [id]);

  /** The agent has called: the start form names it, and the page waits for it to start. */
  const onConnected = useCallback((client: McpClient) => {
    setConnection({ client, lastCallAt: new Date().toISOString() });
    setWaiting(true);
  }, []);

  const startHosted = useCallback(async () => {
    setHostedSending(true);
    setNotice(null);
    const result = await startHeldIssue(id).catch(() => null);
    setHostedSending(false);
    if (!result?.ok) {
      setNotice({ text: ISSUE_PAGE_NOTICES.hosted });
      return;
    }
    const refused = issueStartRefusalOf(result.data);
    if (refused) {
      const ended = START_REFUSAL_STATES[refused.code];
      if (ended) {
        setPage((current) => ({ ...current, state: ended }));
        return;
      }
      const action = refused.action && 'href' in refused.action ? refused.action : null;
      const limit = refused.limit ? limitWordsOf(refused.limit) : null;
      setNotice({ text: refused.text ?? (limit ? `${limit.lead} ${limit.rest}` : ISSUE_PAGE_NOTICES.hosted), action });
      return;
    }
    if (!result.data.started && !result.data.attempt) {
      setNotice({ text: ISSUE_PAGE_NOTICES.hosted });
      return;
    }
    setWaiting(true);
    await ask();
  }, [id, ask]);

  const giveBack = useCallback(async () => {
    setGivingBack(true);
    setNotice(null);
    const result = await giveBackIssue(id).catch(() => null);
    setGivingBack(false);
    if (result?.ok) {
      setWaiting(false);
      setPage(result.data);
    } else setNotice({ text: ISSUE_PAGE_NOTICES.giveBack });
  }, [id]);

  const ownName = connection?.client ? MCP_CLIENT_NAMES[connection.client] : null;
  // Learn's parts show only from Learn: Contribute's page stays as it is.
  const learn = from === 'learn' ? (props.learn ?? null) : null;
  return (
    <IssuePageScreen
      page={page}
      from={from}
      lesson={issueLessonLineOf(learn)}
      learnOnly={learn?.learnOnly ?? false}
      started={learn?.started ?? null}
      back={props.back}
      numbers={props.numbers}
      now={new Date(props.openedAt)}
      pressing={pressing}
      onSee={see}
      notice={notice}
      start={{
        agents: { own: !!connection, hosted: props.hosted },
        ownName,
        alsoLearn: props.alsoLearn,
        waitingPrs: props.start.waitingPrs,
        connect: (
          <AgentConnect
            embedded
            onboarded={props.start.agent.onboarded}
            tokens={props.start.agent.tokens}
            signIn={props.start.agent.signIn}
            openedAt={props.openedAt}
            onConnected={onConnected}
            onAdded={() => void holdLonger()}
            connectSource={from === 'learn' ? 'learn_start' : 'contribute_start'}
            withVsCode
          />
        ),
        onCopy: () => void holdLonger(),
        onHostedStart: () => void startHosted(),
        hostedSending,
      }}
      onGiveBack={() => void giveBack()}
      givingBack={givingBack}
      givenBack={{
        onReason: async (reason, on) => (await setIssueOutReason(id, reason, on).catch(() => null))?.ok === true,
        onNote: async (note) => (await saveIssueOutNote(id, note).catch(() => null))?.ok === true,
      }}
      suspended={suspended ? { appeal: null, onSend: sendFairUseAppeal } : null}
    />
  );
}
