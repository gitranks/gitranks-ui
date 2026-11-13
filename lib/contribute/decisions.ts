import {
  agentLabelOf,
  checkLimitOf,
  isOwnAgent,
  labelOf,
  limitNoteOf,
  RISKS,
  type Tone,
  toneLabelOf,
} from './attempt-format';
import type { ContributeAttempt, ContributeAttemptDetail, ContributeAttemptState } from './contribute.types';
import { timeLeftLabel } from './format';

/** The agent's own verdict on its change, as the card's pill says it. */
export const VERDICTS = { DONE: 'Done', PARTIAL: 'Partly done', NO_GO: 'No-go' } as const;

/** States the agent is still at work in: nothing it wrote is final yet. */
const WORKING: ReadonlySet<ContributeAttemptState> = new Set(['QUEUED', 'CLAIMING', 'RUNNING', 'CHECKS']);
/** States a session ended in. */
const ENDED: ReadonlySet<ContributeAttemptState> = new Set(['STOPPED', 'DISCARDED', 'DONE']);

/** The agent is still at work on the session. */
export const isWorking = (attempt: { state: ContributeAttemptState }): boolean => WORKING.has(attempt.state);
/** The session ended: stopped, discarded, or a run that pushed. */
export const isEnded = (attempt: { state: ContributeAttemptState }): boolean => ENDED.has(attempt.state);

export type AgentDidText = {
  kind: 'no_go' | 'summary' | 'ran_out' | 'brief' | 'go' | 'waiting' | 'missing';
  words: string;
  muted: boolean;
};

/** What the session's "What the agent did" card says; null: the card is not drawn. */
export type AgentDid = {
  /** The pill beside the title; null: none. */
  verdict: { key: string; label: string; tone: 'green' | 'amber' | 'neutral' } | null;
  /** The risk pill: only with a result. */
  risk: { label: string; tone: Tone } | null;
  /** The one paragraph, and where it came from. */
  text: AgentDidText;
  /** "Decided at the check's budget limit, when the agent was told to wrap up." */
  limitNote: string | null;
  worthALook: string | null;
  /** Behind "The agent's notes": the brief, and why it went ahead. */
  notes: { brief: string | null; goReason: string | null } | null;
  /** The user's own agent: who made it, and how long the issue is held for it. */
  ownAgent: { agent: string | null; heldFor: string | null } | null;
} | null;

/**
 * What `agentDidOf` reads. The status box reads it from a list's attempt too, so the session's own fields are
 * optional here.
 */
export type AgentDidFields = Pick<
  ContributeAttempt,
  'state' | 'kind' | 'endReason' | 'endDetail' | 'checkLimit' | 'runner' | 'agent' | 'leaseUntil'
> &
  Partial<Pick<ContributeAttemptDetail, 'result' | 'goNoGo' | 'brief'>>;

const WAITING_HOSTED = "The agent's summary isn't ready yet. It shows here when the agent is done.";
const WAITING_OWN = "Your agent hasn't submitted yet. Its summary shows here when it does.";
const MISSING = "The agent's summary is not available yet.";

/**
 * What the agent did on a session, said once: its verdict and risk, one paragraph (a no-go's reason, the summary, what
 * the check was on when it ran out, the brief, a go's reason, or that it is not ready), the note that it decided at the
 * check's cap, what is worth a look, and its notes (the brief and why it went ahead) when the paragraph is not them
 * already. Null when an ended session left nothing to say: the status box says why it ended.
 */
export function agentDidOf(attempt: AgentDidFields, now?: Date): AgentDid {
  // An API that does not serve the decisions leaves them out: the status box keeps saying the reason.
  const served = attempt.goNoGo !== undefined;
  const goNoGo = served ? (attempt.goNoGo ?? null) : null;
  const result = attempt.result ?? null;
  const brief = served ? attempt.brief?.trim() || null : null;
  const reason = goNoGo?.reason.trim() ?? '';
  const ranOut = checkLimitOf(attempt)?.decided === false;
  const working = isWorking(attempt);
  const ended = isEnded(attempt);
  const own = isOwnAgent(attempt);

  let text: AgentDidText;
  if (goNoGo?.verdict === 'no_go') {
    text = reason
      ? { kind: 'no_go', words: goNoGo.reason, muted: false }
      : { kind: 'no_go', words: 'The agent gave no reason.', muted: true };
  } else if (result) {
    text = result.summary.trim()
      ? { kind: 'summary', words: result.summary, muted: false }
      : { kind: 'summary', words: 'No summary was given.', muted: true };
  } else if (served && ranOut && attempt.endDetail) {
    text = { kind: 'ran_out', words: attempt.endDetail, muted: false };
  } else if (brief) {
    text = { kind: 'brief', words: brief, muted: false };
  } else if (ended && goNoGo?.verdict === 'go' && reason) {
    text = { kind: 'go', words: goNoGo.reason, muted: false };
  } else if (working) {
    text = { kind: 'waiting', words: own ? WAITING_OWN : WAITING_HOSTED, muted: true };
  } else if (ended) {
    return null;
  } else {
    text = { kind: 'missing', words: MISSING, muted: true };
  }

  const verdict: NonNullable<AgentDid>['verdict'] =
    text.kind === 'no_go'
      ? { key: 'NO_GO', label: VERDICTS.NO_GO, tone: 'amber' }
      : result?.verdict === 'DONE'
        ? { key: 'DONE', label: VERDICTS.DONE, tone: 'green' }
        : result?.verdict === 'PARTIAL'
          ? { key: 'PARTIAL', label: VERDICTS.PARTIAL, tone: 'neutral' }
          : result?.verdict === 'NO_GO'
            ? { key: 'NO_GO', label: VERDICTS.NO_GO, tone: 'amber' }
            : result?.verdict
              ? { key: result.verdict, label: labelOf(VERDICTS, result.verdict), tone: 'neutral' }
              : goNoGo?.verdict === 'go'
                ? { key: 'GO', label: 'Go', tone: 'green' }
                : null;

  // The agent's own no-go result rates its risk; a no-go written over a done change does not borrow that risk.
  const risk =
    result && (text.kind !== 'no_go' || result.verdict === 'NO_GO')
      ? result.risk
        ? toneLabelOf(RISKS, result.risk)
        : { label: 'Risk not rated', tone: 'neutral' as const }
      : null;

  // The brief behind the notes, unless the paragraph says it already (a no-go's brief is its reason).
  const notesBrief =
    brief && text.kind !== 'brief' && brief !== reason && brief !== result?.summary.trim() ? brief : null;
  const goReason = goNoGo?.verdict === 'go' && reason && reason !== brief && text.kind !== 'go' ? goNoGo.reason : null;

  return {
    verdict,
    risk,
    text,
    limitNote: goNoGo?.decidedAtLimit ? limitNoteOf({ limit: goNoGo.decidedAtLimit, decided: true }) : null,
    worthALook: result?.riskNotes || null,
    notes: notesBrief || goReason ? { brief: notesBrief, goReason } : null,
    ownAgent: own
      ? { agent: agentLabelOf(attempt.agent), heldFor: timeLeftLabel(attempt.leaseUntil, now) || null }
      : null,
  };
}

/**
 * What the status box leaves to the "What the agent did" card: a no-go's reason (or what the check was on when it ran
 * out, or the brief that stands for it), and the note that the agent decided at the check's cap.
 */
export function shownByDecisions(attempt: AgentDidFields): { noGoDetail: boolean; limitNote: boolean } {
  const did = agentDidOf(attempt);
  return {
    noGoDetail:
      !!did &&
      attempt.endReason === 'NO_GO' &&
      (did.text.kind === 'no_go' || did.text.kind === 'ran_out' || did.text.kind === 'brief'),
    limitNote: !!did?.limitNote,
  };
}
