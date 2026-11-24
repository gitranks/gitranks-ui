import { plural } from '@/lib/workspace/format';
import type { MaskedIssue } from '@/lib/workspace/masked-issue.types';

/** The pool's public numbers. */
export type AgentPageStats = {
  readyIssues: number;
  repos: number;
  languages: { language: string; issues: number }[];
  checkedAt: string | null;
};

/**
 * One issue of the day's sample: the same for everyone. A masked one names nothing: its project, number, link, title,
 * labels and reasons are null, and what it shows is in `masked`.
 */
export type AgentPageIssue = {
  repo: string | null;
  number: number | null;
  url: string | null;
  title: string | null;
  labels: string[] | null;
  language: string | null;
  kind: string | null;
  size: string | null;
  why: string[] | null;
  testCommand: boolean;
  masked?: MaskedIssue | null;
};

/** What the page for AI agents shows: the numbers and the day's sample. */
export type AgentPage = {
  stats: AgentPageStats | null;
  sample: { day: string | null; items: AgentPageIssue[] };
};

/** "3,124 issues ready in 1,412 repositories, checked at 12:04 UTC": the landing's and the page's numbers line. */
export function agentPageStatsLineOf(stats: AgentPageStats): string {
  const at = stats.checkedAt ? new Date(stats.checkedAt) : null;
  const checked = at && !Number.isNaN(at.getTime()) ? `, checked at ${at.toISOString().slice(11, 16)} UTC` : '';
  return `${plural(stats.readyIssues, 'issue')} ready in ${plural(stats.repos, 'repository', 'repositories')}${checked}`;
}
