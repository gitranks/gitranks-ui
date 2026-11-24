import type { PrTimeline, PrTimelineActor, PrTimelineMilestone } from './pr-timeline.types';

/** A row as the page draws it: the title, who did it, a paragraph, small numbers, links. */
export type PrTimelineRowWords = {
  title: string;
  /** A link the title ends with (the pull request, the issue). */
  titleLink?: { text: string; href: string };
  actor: string | null;
  agent: boolean;
  text: string | null;
  pills: string[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86_400_000;

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/** "Oct 24", in UTC. */
export const shortDateOf = (iso: string) => {
  const at = new Date(iso);
  return `${MONTHS[at.getUTCMonth()]} ${at.getUTCDate()}`;
};

/** "Oct 24, 2026", in UTC. */
export const fullDateOf = (iso: string) => `${shortDateOf(iso)}, ${new Date(iso).getUTCFullYear()}`;

/** "Sat, Oct 24": a day's heading, in UTC. */
export const dayHeadingOf = (iso: string) => `${DAYS[new Date(iso).getUTCDay()]}, ${shortDateOf(iso)}`;

/** "09:12", in UTC. */
export const timeOf = (iso: string) => new Date(iso).toISOString().slice(11, 16);

/** The UTC day a row falls on: rows are grouped by it. */
export const dayKeyOf = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** "38 min", "2 h 5 min". */
export const durationOf = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const ACTORS: Readonly<Record<PrTimelineActor, string | null>> = {
  AGENT: 'Agent',
  CONTRIBUTOR: 'Contributor',
  AUTOPILOT: 'Autopilot',
  MAINTAINER: 'Maintainer',
  GITRANKS: 'GitRanks',
  NONE: null,
};

/** The numbers a work row carries: its minutes, files, lines and tests. */
function workPills(row: PrTimelineMilestone): string[] {
  const pills: string[] = [];
  if (row.minutes !== null) pills.push(durationOf(row.minutes));
  if (row.files) pills.push(plural(row.files, 'file'));
  if (row.added || row.removed) pills.push(`+${row.added ?? 0} −${row.removed ?? 0}`);
  if (row.testsAdded) pills.push(`${plural(row.testsAdded, 'test')} added`);
  return pills;
}

const whoOf = (row: PrTimelineMilestone, timeline: PrTimeline) =>
  row.login ?? timeline.contributorLogin ?? 'The contributor';

/** The title of a row whose kind this page does not know yet: a plain row, never a broken page. */
export const PLAIN_ROW_TITLE = 'Another step';

/**
 * One row's words: every sentence on the page is written here, from the row's kind and numbers. A kind the API adds
 * before this page learns it is drawn as a plain row: its title, its actor, nothing else.
 */
export function milestoneWordsOf(row: PrTimelineMilestone, timeline: PrTimeline): PrTimelineRowWords {
  const base = { actor: ACTORS[row.by] ?? null, agent: row.by === 'AGENT', text: null, pills: [] as string[] };
  const who = whoOf(row, timeline);
  switch (row.kind) {
    case 'PICKED':
      return {
        ...base,
        title: 'Issue picked',
        titleLink: { text: `#${row.number ?? timeline.issue.number} ↗`, href: timeline.issue.url },
      };
    case 'CHECKED':
      return {
        ...base,
        title: 'Checked the issue before writing code',
        text: row.overridden
          ? `The agent advised against it; ${timeline.contributorLogin ?? 'the contributor'} chose to go ahead.`
          : row.text,
        pills: row.minutes !== null ? [durationOf(row.minutes)] : [],
      };
    case 'WORKED':
      return { ...base, title: 'Wrote the fix', text: row.text, pills: workPills(row) };
    case 'CHECKS': {
      const tries = row.tries === null ? null : row.tries === 1 ? 'on the first try' : `after ${row.tries} tries`;
      const notes = [
        row.failingFirst ? 'A new test fails without the fix and passes with it.' : null,
        tries ? `The contributor’s agent passed them ${tries}.` : null,
      ].filter(Boolean);
      return {
        ...base,
        title: row.passed ? 'Our checks passed' : 'Some of our checks failed',
        text: notes.length ? notes.join(' ') : null,
      };
    }
    case 'WALKTHROUGH':
      return { ...base, title: `${who} passed the walkthrough of the change` };
    case 'APPROVED':
      return {
        ...base,
        title:
          row.by === 'AUTOPILOT'
            ? `${who}’s autopilot approved it, unreviewed`
            : `${who} reviewed the change and approved it`,
      };
    case 'OPENED':
      return {
        ...base,
        title: `Pull request opened in ${timeline.contributorLogin ?? 'the contributor'}’s name`,
        titleLink: { text: `#${row.number ?? timeline.number} ↗`, href: timeline.url },
      };
    case 'REVIEWED':
      return {
        ...base,
        title:
          row.reviewState === 'APPROVED'
            ? `${who} approved`
            : row.reviewState === 'CHANGES_REQUESTED'
              ? `${who} asked for changes`
              : `${who} commented`,
      };
    case 'FOLLOW_UP':
      return { ...base, title: 'Worked on the review', text: row.text, pills: workPills(row) };
    case 'UPDATE_APPROVED':
      return {
        ...base,
        title: row.by === 'AUTOPILOT' ? `${who}’s autopilot approved the update` : `${who} approved the update`,
      };
    case 'PUSHED': {
      const parts = [
        row.commits ? `pushed ${plural(row.commits, 'commit')}` : null,
        row.replies ? `posted ${plural(row.replies, 'reply', 'replies')}` : null,
      ].filter(Boolean) as string[];
      const title = parts.length ? parts.join(' and ') : 'updated the description';
      return { ...base, title: `${title[0].toUpperCase()}${title.slice(1)}` };
    }
    case 'STOPPED':
      return { ...base, title: 'A maintainer stopped GitRanks work on this pull request' };
    case 'CLOSED':
      return {
        ...base,
        title:
          row.by === 'GITRANKS'
            ? 'Closed by GitRanks after it went quiet'
            : row.by === 'NONE'
              ? 'Closed'
              : row.login
                ? `Closed by ${row.login}`
                : 'Closed by a maintainer',
      };
    case 'REOPENED':
      return { ...base, title: 'Reopened' };
    case 'MERGED':
      return { ...base, title: 'Merged' };
    default: {
      // Every kind this page knows is worded above; a kind the API added since still reaches here at run time.
      row.kind satisfies never;
      return { ...base, title: PLAIN_ROW_TITLE };
    }
  }
}

/** The facts under the head, at most five: one with nothing to say (no agent work, no checks) is left out. */
export type PrTimelineFact = { label: string; value: string; note: string | null };

export function factsOf(timeline: PrTimeline): PrTimelineFact[] {
  const rows = timeline.milestones;
  const runs = rows.filter((row) => row.kind === 'WORKED' || row.kind === 'FOLLOW_UP');
  const minutes = rows
    .filter((row) => row.kind === 'CHECKED' || row.kind === 'WORKED' || row.kind === 'FOLLOW_UP')
    .reduce((sum, row) => sum + (row.minutes ?? 0), 0);
  const checks = [...rows].reverse().find((row) => row.kind === 'CHECKS');
  const rounds = rows.filter((row) => row.kind === 'FOLLOW_UP').length;
  const reviews = rows.filter((row) => row.kind === 'REVIEWED').length;
  const facts: { label: string; value: string | null; note: string | null }[] = [
    {
      label: 'Agent',
      value: timeline.agentPhrase || null,
      note: timeline.ownAgent ? 'the contributor’s own agent' : 'run by GitRanks',
    },
    {
      label: 'Agent work',
      value: minutes ? durationOf(minutes) : null,
      note: runs.length ? plural(runs.length, 'run') : null,
    },
    {
      label: 'Our checks',
      value: checks ? (checks.passed ? 'Passed' : 'Some failed') : null,
      note:
        checks?.tries === null || checks?.tries === undefined
          ? null
          : checks.tries === 1
            ? 'on the first try'
            : `after ${checks.tries} tries`,
    },
    { label: 'Review rounds', value: String(rounds), note: reviews ? plural(reviews, 'maintainer review') : null },
    endFactOf(timeline),
  ];
  return facts.filter((fact): fact is PrTimelineFact => fact.value !== null);
}

function endFactOf(timeline: PrTimeline): PrTimelineFact {
  const days = (end: string) => Math.max(0, Math.round((Date.parse(end) - Date.parse(timeline.openedAt)) / DAY_MS));
  const span = (end: string) => (days(end) ? plural(days(end), 'day') : 'Same day');
  if (timeline.state === 'MERGED' && timeline.mergedAt) {
    return {
      label: 'Opened to merged',
      value: span(timeline.mergedAt),
      note: `${shortDateOf(timeline.openedAt)} to ${shortDateOf(timeline.mergedAt)}`,
    };
  }
  if (timeline.state === 'CLOSED' && timeline.closedAt) {
    return {
      label: 'Opened to closed',
      value: span(timeline.closedAt),
      note: `Closed after ${days(timeline.closedAt) ? plural(days(timeline.closedAt), 'day') : 'less than a day'}`,
    };
  }
  return { label: 'Open', value: `Since ${shortDateOf(timeline.openedAt)}`, note: null };
}

/** The head's line under the title: who opened it, and how it was reviewed. */
export function openedLineOf(timeline: PrTimeline): string {
  const login = timeline.contributorLogin ?? 'its contributor';
  return timeline.reviewed
    ? `opened ${shortDateOf(timeline.openedAt)} by ${login}, who reviewed and submitted it`
    : `opened ${shortDateOf(timeline.openedAt)} by ${login}’s autopilot, not reviewed by a person`;
}

export const stateWordOf = (state: PrTimeline['state']) =>
  state === 'MERGED' ? 'Merged' : state === 'CLOSED' ? 'Closed' : 'Open';
