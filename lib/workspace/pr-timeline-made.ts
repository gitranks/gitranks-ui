import type { PrTimeline, PrTimelineMilestone } from './pr-timeline.types';

/*
 * "How it was made": a pull request's public page as a short list of what happened, worded here from the timeline's
 * rows. The steps before the fix (the pick, the check of the issue) are left out, the review is told in rounds, and an
 * open pull request ends with what it waits for. Also the issue card's words, which both views of a fix share.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/** "21 Nov", in UTC. */
export const dayMonthOf = (iso: string) => {
  const at = new Date(iso);
  return `${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]}`;
};

const dayKeyOf = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** Whole days from one time to another, never below zero. */
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS));

/** "44 minutes", "2 hours", "1 hour 5 minutes". */
export function minutesWordsOf(minutes: number): string {
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${plural(hours, 'hour')} ${plural(rest, 'minute')}` : plural(hours, 'hour');
}

/** "on the first try", "after 7 tries"; null when the row does not say. */
const triesWordsOf = (tries: number | null) =>
  tries === null || tries < 1
    ? null
    : tries <= ORDINALS.length
      ? `on the ${ORDINALS[tries - 1]} try`
      : `after ${tries} tries`;

/** "A, B and C". */
const listOf = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const sentence = (text: string) => `${text[0]?.toUpperCase() ?? ''}${text.slice(1)}${text.endsWith('.') ? '' : '.'}`;

/** Who a row's dot marks: the agent, anyone else, the end (filled), or a stop (filled, grey). */
export type MadeDot = 'agent' | 'other' | 'end' | 'stopped';

export type MadeRowKind =
  | 'fix'
  | 'walkthrough'
  | 'approved'
  | 'sent'
  | 'opened'
  | 'round'
  | 'review'
  | 'waiting'
  | 'stopped'
  | 'closed'
  | 'reopened'
  | 'merged';

/** One row of "How it was made": its label and date on the left, a sentence and a quiet note on the right. */
export type MadeRow = {
  kind: MadeRowKind;
  label: string;
  /** "21 Nov", or "since 21 Nov" for what the pull request waits for. */
  date: string;
  /** When it happened (ISO), for the page's `<time>`. */
  at: string;
  text: string;
  note: string | null;
  dot: MadeDot;
};

export type MadeOptions = {
  /** The walkthrough's questions; null when the page does not show the walkthrough. */
  questions?: number | null;
};

const whoOf = (timeline: PrTimeline) => timeline.contributorLogin ?? 'The contributor';

function fixRowOf(timeline: PrTimeline, worked: PrTimelineMilestone, checks: PrTimelineMilestone | null): MadeRow {
  const took = worked.minutes ? ` in ${minutesWordsOf(worked.minutes)}` : '';
  const agent = timeline.ownAgent
    ? `${timeline.agentPhrase}, ${whoOf(timeline)}’s own agent,`
    : `${timeline.agentPhrase}, run by GitRanks,`;
  let note: string | null = null;
  if (checks?.passed === false) note = 'Some of our checks failed.';
  else if (checks?.passed) {
    const tries = triesWordsOf(checks.tries);
    const what = checks.failingFirst
      ? 'the project’s tests, and a new test that fails without the change'
      : 'the project’s tests';
    note = `Our checks passed${tries ? ` ${tries}` : ''}: ${what}.`;
  }
  return {
    kind: 'fix',
    label: 'Fix',
    date: dayMonthOf(worked.at),
    at: worked.at,
    text: `${agent} wrote the fix${took}.`,
    note,
    dot: 'agent',
  };
}

/** A review's words: "tomas-r asked for changes", "mara-k approved it", "A maintainer commented". */
function askWordsOf(row: PrTimelineMilestone): string {
  const who = row.login ?? 'A maintainer';
  if (row.reviewState === 'APPROVED') return `${who} approved it`;
  if (row.reviewState === 'CHANGES_REQUESTED') return `${who} asked for changes`;
  return `${who} commented`;
}

type Round = { asks: PrTimelineMilestone[]; work: PrTimelineMilestone[] };

function roundRowOf(round: Round, number: number): MadeRow {
  const first = round.asks[0] ?? round.work[0];
  const asks = [...new Set(round.asks.map(askWordsOf))];
  const pushes = round.work.filter((row) => row.kind === 'PUSHED');
  const commits = pushes.reduce((sum, row) => sum + (row.commits ?? 0), 0);
  const replies = pushes.reduce((sum, row) => sum + (row.replies ?? 0), 0);
  const sent = [
    commits ? plural(commits, 'commit') : null,
    replies ? plural(replies, 'reply', 'replies') : null,
  ].filter(Boolean) as string[];
  let note: string | null = null;
  if (pushes.length && round.asks.length) {
    const days = daysBetween(dayKeyOf(round.asks[0].at), dayKeyOf(pushes[0].at));
    const when = days ? `${plural(days, 'day')} later` : 'the same day';
    note = sent.length ? `Answered ${when}, with ${listOf(sent)}.` : `Answered ${when}.`;
  } else if (pushes.length && sent.length) {
    note = sentence(listOf(sent));
  }
  // A round with no answer yet, or a review that only approved, is a review, not a round.
  const worked = round.work.length > 0;
  return {
    kind: worked ? 'round' : 'review',
    label: worked ? `Round ${number}` : 'Review',
    date: dayMonthOf(first.at),
    at: first.at,
    text: asks.length ? `${listOf(asks)}.` : 'Worked on the review.',
    note,
    dot: round.work.some((row) => row.kind === 'FOLLOW_UP') ? 'agent' : 'other',
  };
}

function afterOpeningOf(timeline: PrTimeline, row: PrTimelineMilestone): string {
  const days = daysBetween(timeline.openedAt, row.at);
  return days ? `${plural(days, 'day')} after the pull request opened.` : 'The same day the pull request opened.';
}

function endRowOf(timeline: PrTimeline, row: PrTimelineMilestone): MadeRow | null {
  const base = { date: dayMonthOf(row.at), at: row.at };
  switch (row.kind) {
    case 'STOPPED':
      return {
        ...base,
        kind: 'stopped',
        label: 'Stopped',
        text: 'A maintainer stopped GitRanks work on this pull request.',
        note: 'It stays as it is on GitHub.',
        dot: 'stopped',
      };
    case 'CLOSED':
      return {
        ...base,
        kind: 'closed',
        label: 'Closed',
        text:
          row.by === 'GITRANKS'
            ? 'GitRanks closed the pull request after it went quiet.'
            : row.login
              ? `${row.login} closed the pull request without merging it.`
              : 'The pull request was closed without being merged.',
        note: afterOpeningOf(timeline, row),
        dot: 'end',
      };
    case 'REOPENED':
      return {
        ...base,
        kind: 'reopened',
        label: 'Reopened',
        text: 'The pull request was opened again.',
        note: null,
        dot: 'other',
      };
    case 'MERGED':
      return {
        ...base,
        kind: 'merged',
        label: 'Merged',
        text: `Merged into ${timeline.nameWithOwner}.`,
        note: afterOpeningOf(timeline, row),
        dot: 'end',
      };
    default:
      return null;
  }
}

/**
 * The rows of "How it was made", oldest first. A kind this page does not know is left out; with `questions`, the
 * walkthrough's row counts them.
 */
export function madeRowsOf(timeline: PrTimeline, { questions = null }: MadeOptions = {}): MadeRow[] {
  const rows: MadeRow[] = [];
  const all = timeline.milestones;
  const worked = all.find((row) => row.kind === 'WORKED');
  if (worked) {
    const checks = all.find((row) => row.kind === 'CHECKS' && row.at >= worked.at) ?? null;
    rows.push(fixRowOf(timeline, worked, checks));
  }
  const walkthrough = all.find((row) => row.kind === 'WALKTHROUGH');
  if (walkthrough) {
    const who = walkthrough.login ?? whoOf(timeline);
    rows.push({
      kind: 'walkthrough',
      label: 'Walkthrough',
      date: dayMonthOf(walkthrough.at),
      at: walkthrough.at,
      text: questions
        ? `${who} answered ${plural(questions, 'question')} about the change.`
        : `${who} passed the walkthrough of the change.`,
      note: null,
      dot: 'other',
    });
  }
  const approved = all.find((row) => row.kind === 'APPROVED');
  const opened = all.find((row) => row.kind === 'OPENED');
  const files = opened?.files ?? timeline.change.files;
  const openedWords = files ? `The pull request opened with ${plural(files, 'file')}.` : 'The pull request opened.';
  if (approved?.by === 'AUTOPILOT') {
    rows.push({
      kind: 'sent',
      label: 'Sent',
      date: dayMonthOf(approved.at),
      at: approved.at,
      text: `${approved.login ?? whoOf(timeline)}’s autopilot sent it: no person read the change first.`,
      note: opened ? openedWords : null,
      dot: 'other',
    });
  } else if (approved) {
    rows.push({
      kind: 'approved',
      label: 'Approved',
      date: dayMonthOf(approved.at),
      at: approved.at,
      text: `${approved.login ?? whoOf(timeline)} read the change and sent it.`,
      note: opened ? openedWords : null,
      dot: 'other',
    });
  } else if (opened) {
    rows.push({
      kind: 'opened',
      label: 'Opened',
      date: dayMonthOf(opened.at),
      at: opened.at,
      text: openedWords,
      note: null,
      dot: 'other',
    });
  }

  // After the opening: the review in rounds (what was asked, then what was sent), and the ends.
  const start = opened ? all.indexOf(opened) + 1 : approved ? all.indexOf(approved) + 1 : all.length;
  let round: Round | null = null;
  let rounds = 0;
  const close = () => {
    if (!round) return;
    if (round.work.length) rounds += 1;
    rows.push(roundRowOf(round, rounds));
    round = null;
  };
  for (const row of all.slice(start)) {
    if (row.kind === 'REVIEWED') {
      if (round && (round as Round).work.length) close();
      round ??= { asks: [], work: [] };
      round.asks.push(row);
    } else if (row.kind === 'FOLLOW_UP' || row.kind === 'UPDATE_APPROVED' || row.kind === 'PUSHED') {
      round ??= { asks: [], work: [] };
      round.work.push(row);
    } else {
      const end = endRowOf(timeline, row);
      if (!end) continue;
      close();
      rows.push(end);
    }
  }
  close();

  const last = all[all.length - 1];
  if (timeline.state === 'OPEN' && !timeline.stopped && last?.kind !== 'STOPPED' && (opened || approved)) {
    const asked = all.slice(start).filter((row) => row.kind === 'REVIEWED');
    const lastAsk = asked[asked.length - 1];
    const answered = lastAsk && all.slice(all.indexOf(lastAsk)).some((row) => row.kind === 'PUSHED');
    const waitsOnContributor = lastAsk && lastAsk.reviewState !== 'APPROVED' && !answered;
    const since = last?.at ?? timeline.openedAt;
    rows.push({
      kind: 'waiting',
      label: 'Review',
      date: `since ${dayMonthOf(since)}`,
      at: since,
      text: waitsOnContributor
        ? `Waiting for ${whoOf(timeline)} to answer the review.`
        : 'Waiting for the project’s maintainers.',
      note: asked.length ? null : 'Nobody from the project has answered yet.',
      dot: 'other',
    });
  }
  return rows;
}

/** The issue card's state pill: "merged 1 Dec", "open since 21 Nov", "closed 24 Nov". */
export type FixStatePill = { text: string; tone: 'positive' | 'brand' | 'muted' };

export function fixStatePillOf(
  timeline: Pick<PrTimeline, 'state' | 'openedAt' | 'mergedAt' | 'closedAt'>,
): FixStatePill {
  if (timeline.state === 'MERGED') {
    return { text: timeline.mergedAt ? `merged ${dayMonthOf(timeline.mergedAt)}` : 'merged', tone: 'positive' };
  }
  if (timeline.state === 'CLOSED') {
    return { text: timeline.closedAt ? `closed ${dayMonthOf(timeline.closedAt)}` : 'closed', tone: 'muted' };
  }
  return { text: `open since ${dayMonthOf(timeline.openedAt)}`, tone: 'brand' };
}

/**
 * The line under the issue card's title, around the person's login: "Fixed by" octocat "with their own agent, Claude
 * Code." for a Learn fix; "Made with GitRanks Contribute, powered by Claude." hubot "reviewed and submitted it." for
 * a Contribute pull request. `agent` names the agent as the page knows it (the fix's own name for it).
 */
export type FixByline = { before: string; login: string | null; after: string };

export function fixBylineOf(
  timeline: PrTimeline,
  made: 'LEARN' | 'CONTRIBUTE',
  agent: string | null = null,
): FixByline {
  const login = timeline.contributorLogin;
  if (made === 'CONTRIBUTE') {
    const before = 'Made with GitRanks Contribute, powered by Claude.';
    if (!timeline.reviewed)
      return { before, login, after: login ? '’s autopilot sent it: no person read the change first.' : '' };
    return { before, login, after: login ? 'reviewed and submitted it.' : '' };
  }
  const name = agent ?? timeline.agentPhrase;
  const how = timeline.ownAgent ? `with their own agent, ${name}.` : `with ${name}, run by GitRanks.`;
  const state =
    timeline.state === 'OPEN'
      ? ' The project has not merged it yet.'
      : timeline.state === 'CLOSED'
        ? ' The project closed it without merging.'
        : '';
  return { before: timeline.state === 'MERGED' ? 'Fixed by' : 'Sent by', login, after: `${how}${state}` };
}

/** The change card: the agent's own words on the fix, and its numbers. */
export type FixChange = { text: string | null; pills: string[]; diffUrl: string };

export function fixChangeOf(timeline: PrTimeline): FixChange {
  const worked = timeline.milestones.find((row) => row.kind === 'WORKED');
  const { change } = timeline;
  const pills = [
    change.files ? plural(change.files, 'file') : null,
    change.added ? `${plural(change.added, 'line')} added` : null,
    change.removed ? `${change.removed.toLocaleString('en-US')} removed` : null,
    change.testsAdded ? `${plural(change.testsAdded, 'test')} added` : null,
  ].filter(Boolean) as string[];
  return { text: worked?.text ?? null, pills, diffUrl: `${timeline.url}/files` };
}

/** "+3 more" after the named people who said it helped; null when every one is named. */
export function helpedMoreOf(helped: { names: readonly string[]; named: number }): string | null {
  const more = helped.named - helped.names.length;
  return more > 0 ? `+${more.toLocaleString('en-US')} more` : null;
}
