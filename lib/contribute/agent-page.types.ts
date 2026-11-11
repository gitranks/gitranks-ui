/** The pool's public numbers. */
export type AgentPageStats = {
  readyIssues: number;
  repos: number;
  languages: { language: string; issues: number }[];
  checkedAt: string | null;
};

/** One issue of the day's sample: the same for everyone. */
export type AgentPageIssue = {
  repo: string;
  number: number;
  url: string;
  title: string | null;
  labels: string[];
  language: string | null;
  kind: string | null;
  size: string | null;
  why: string[];
  testCommand: boolean;
};

/** What the page for AI agents shows: the numbers and the day's sample. */
export type AgentPage = {
  stats: AgentPageStats | null;
  sample: { day: string | null; items: AgentPageIssue[] };
};

/** "3,124 issues ready in 1,412 repositories, checked at 12:04 UTC": the landing's and the page's numbers line. */
export function agentPageStatsLineOf(stats: AgentPageStats): string {
  const n = (value: number) => value.toLocaleString('en-US');
  const at = stats.checkedAt ? new Date(stats.checkedAt) : null;
  const checked = at && !Number.isNaN(at.getTime()) ? `, checked at ${at.toISOString().slice(11, 16)} UTC` : '';
  return `${n(stats.readyIssues)} issues ready in ${n(stats.repos)} repositories${checked}`;
}
