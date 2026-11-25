'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AgentConnect } from '@/components/workspace/agent/agent-connect';
import { sendFairUseAppeal } from '@/components/workspace/fair-use-appeal-live';
import { type IssuePageNotice, IssuePageScreen } from '@/components/workspace/masked-issue/issue-page-screen';
import type { ContributeActionResult } from '@/lib/workspace/errors';
import { isLookExtended, markExtendedLook } from '@/lib/workspace/extended-look';
import { clearHeldMark, writeHeldMark } from '@/lib/workspace/held-mark';
import { type IssueKeptForLearners, keptNowOf } from '@/lib/workspace/issue-page-kept';
import { readIssueKept } from '@/lib/workspace/issue-page-kept.actions';
import { type IssuePageLearn, issueLessonLineOf } from '@/lib/workspace/issue-page-learn';
import { ISSUE_SETUP_LINES, type IssueSetup, issueSetupHrefOf } from '@/lib/workspace/issue-page-signs';
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

/** The longest wait a browser timer takes: a time further off is checked again then. */
const MAX_TIMEOUT_MS = 2_147_483_647;

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
  /** From Contribute: the person also uses Learn (a saved setup of Learn, or a Learn attempt of theirs). */
  alsoLearn: boolean;
  /**
   * From Contribute, the line that adds the walkthrough to the fix: by the Learn sign (`issueStartSignsOf`). Left out,
   * `alsoLearn`.
   */
  walkthrough?: boolean;
  /** From Learn, "Just fix it" is offered: the person has the Contribute sign. Left out, it is. */
  justFix?: boolean;
  /**
   * The onboarding the fix needs first (`issueSetupOf`): "Start fixing it" holds the issue longer and leads into it,
   * with the way back here. Null or left out: the start form.
   */
  setup?: IssueSetup | null;
  /** Back from the sign-in with a press made before it (`?look=1`): the press is made now, once. */
  returning: boolean;
  /**
   * From Learn: Learn's parts, read on their own (the lesson and why, kept for learners, how the work started). Null or
   * left out, the page draws none of them.
   */
  learn?: IssuePageLearn | null;
  /**
   * From Contribute: the issue is kept for learners from the person, read on its own. The page then offers no press and
   * no start, and says so (with the way to it in Learn for a person who uses Learn). Null or left out: today's page.
   */
  kept?: IssueKeptForLearners | null;
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
  const [kept, setKept] = useState(props.kept ?? null);
  // The kept answer was read again after a press Contribute refused as not available: only then does it stand in for
  // that plain end (one read before any press is the person's own skip or give-back).
  const [keptOnRefusal, setKeptOnRefusal] = useState(false);
  const keptRef = useRef(kept);
  keptRef.current = kept;
  // The onboarding the fix needs first: from the page's read, or a hosted start the server refused for it.
  const [setup, setSetup] = useState<IssueSetup | null>(props.setup ?? null);
  const [setupPressing, setSetupPressing] = useState(false);
  // The look was held longer on the way into the onboarding: the form says when the hold ends, and a copy asks for no
  // second extension. Read in the browser, once the page is there.
  const [extended, setExtended] = useState(false);
  useEffect(() => setExtended(isLookExtended(id, Date.now())), [id]);
  // A page opened in full with the person's agent connected (a reload) waits for the agent at once, unless the fix
  // needs an onboarding first.
  const [waiting, setWaiting] = useState(props.page.state === 'FULL' && !!props.start.connection && !props.setup);
  const routerRef = useRef(router);
  routerRef.current = router;

  // The browser's mark of the issue held open, for the lists: written when a look starts or is held longer (and for
  // another issue the page says is held), cleared once this one is given back, started, ended or seen past.
  useEffect(() => {
    if (page.state === 'FULL' && page.until) writeHeldMark({ id, until: page.until });
    else if (page.holding) writeHeldMark(page.holding);
    if (page.state !== 'FULL' && page.state !== 'MASKED') clearHeldMark(id);
  }, [id, page.state, page.until, page.holding]);

  /**
   * The page after a press: in full, one of the ends, or the closed access. A press Contribute refuses as not available
   * asks again, on its own, whether the issue is kept for learners (a read made before it was, or none), so the end
   * says so in place of its plain words.
   */
  const onLooked = useCallback(
    async (result: ContributeActionResult<IssueLooked>) => {
      if (!result.ok) {
        setNotice({ text: ISSUE_PAGE_NOTICES.look });
        return;
      }
      const { outcome, page: answered } = result.data;
      if (outcome === 'SUSPENDED') {
        setSuspended(true);
        return;
      }
      if (outcome === 'NOT_AVAILABLE' && from === 'contribute') {
        // A read that worked sets the answer, "not kept" included; one that failed keeps what the page showed.
        const again = await readIssueKept(id).catch(() => null);
        const next = again ? again.kept : keptRef.current;
        if (again) setKept(again.kept);
        setKeptOnRefusal(next !== null);
      }
      if (answered) setPage(answered);
      else {
        const state = OUTCOME_STATES[outcome];
        if (state) setPage((current) => ({ ...current, state }));
      }
    },
    [id, from],
  );

  const see = useCallback(async () => {
    setPressing(true);
    setNotice(null);
    const result = await lookAtIssue(id, from).catch(() => null);
    await onLooked(result ?? { ok: false, error: 'FAILED' });
    setPressing(false);
  }, [id, from, onLooked]);

  // Back from the sign-in: the press made before it, once, and the address without it (a reload makes no second one).
  // The sign-in's mark is used up either way; the press is made only while the details are still hidden.
  const returned = useRef(false);
  useEffect(() => {
    if (!props.returning || returned.current) return;
    returned.current = true;
    routerRef.current.replace(issuePageHrefOf(id, from, false, view));
    // An issue kept for learners from Contribute: the sign-in's mark is used up, and no press is made (it would be
    // refused).
    const keptNow = from === 'contribute' && keptNowOf(keptRef.current, new Date()) !== null;
    const masked = props.page.state === 'MASKED' && !keptNow;
    if (masked) setPressing(true);
    void lookOnReturn(id, from, masked)
      .catch(() => null)
      .then(async (result) => {
        if (result) await onLooked(result);
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
  // Kept for learners shows only from Contribute, where it cannot be taken (the way to it in Learn only to a person who
  // uses Learn). Nothing can start there: no wait while it is kept.
  const keptHere = from === 'contribute' ? kept : null;
  const waitingNow = waiting && keptHere === null && setup === null;
  useFastChanges(waitingNow);
  useChanges(['ATTEMPTS'], () => void ask(), waitingNow);

  // An issue kept until a time: once it passes, it is no longer kept, and the press (or the wait) comes back.
  useEffect(() => {
    const until = keptHere?.until;
    if (!until) return;
    const left = Date.parse(until) - Date.now();
    // Checked again at the time (a new answer object, so a time still to come is waited for once more).
    const timer = setTimeout(
      () =>
        setKept((current) => {
          const still = keptNowOf(current, new Date());
          return still ? { ...still } : null;
        }),
      Math.min(Math.max(left, 0), MAX_TIMEOUT_MS),
    );
    return () => clearTimeout(timer);
  }, [keptHere]);

  /** The issue held 30 minutes, once (not again once held longer); then the page waits for the agent. */
  const holdLonger = useCallback(async () => {
    setWaiting(true);
    if (extended) return;
    const result = await extendIssueLook(id).catch(() => null);
    if (result?.ok) setPage(result.data);
  }, [id, extended]);

  /**
   * "Start fixing it" without the sign: the look's one extension, so the issue is usually still held on the way back,
   * then the onboarding. The extension's answer is awaited, so leaving the page does not cut it short.
   */
  const pressSetup = useCallback(async () => {
    if (!setup) return;
    setSetupPressing(true);
    const result = await extendIssueLook(id).catch(() => null);
    if (result?.ok && result.data.until) markExtendedLook({ id, until: result.data.until });
    routerRef.current.push(issueSetupHrefOf(setup, id, view));
  }, [id, setup, view]);

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
    // The onboarding is not finished: the button into it and its line, in the form's place.
    if (refused?.code === 'SETUP_UNFINISHED') {
      setSetup(from);
      return;
    }
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
  }, [id, from, ask]);

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
      kept={keptHere}
      keptOnRefusal={keptOnRefusal}
      learnHref={keptHere && props.alsoLearn ? issuePageHrefOf(id, 'learn') : null}
      back={props.back}
      numbers={props.numbers}
      now={new Date(props.openedAt)}
      pressing={pressing}
      onSee={see}
      notice={notice}
      setup={
        setup ? { line: ISSUE_SETUP_LINES[setup], onPress: () => void pressSetup(), pressing: setupPressing } : null
      }
      start={{
        agents: { own: !!connection, hosted: props.hosted },
        ownName,
        alsoLearn: props.walkthrough ?? props.alsoLearn,
        justFix: props.justFix ?? true,
        heldUntil: extended && page.state === 'FULL' ? page.until : null,
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
