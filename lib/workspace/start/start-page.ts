import type { Route } from 'next';

import type { LearnStartConnection, StartMode, StartPageAttempt, StartPageIssueView } from './start-page.types';
import type { ContributeAttemptState, ContributeMcpToken } from '@/lib/workspace/contribute.types';
import { relativeLabel } from '@/lib/workspace/format';
import { MCP_CLIENT_NAMES, MCP_CLIENTS, type McpClient } from '@/lib/workspace/mcp-setup';
import { isSignedInAgent } from '@/lib/workspace/oauth-consent';
import { PICK_ISSUE_PATHS, pullRequestPath } from '@/lib/workspace/paths';

/**
 * The Start page for one issue, `/my/start/<owner>/<repo>/<issue>` (Learn's step 3, at `/learn/start/…`, uses its body):
 * the address it names, the agent that is connected, and what the page says of an attempt it finds.
 */

/** A GitHub owner: letters, digits and hyphens, up to 39 characters. */
const OWNER = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
/** A GitHub repository's name: letters, digits, `.`, `_` and `-`, up to 100 characters; never `.` or `..`. */
const NAME = /^[A-Za-z0-9._-]{1,100}$/;
const NUMBER = /^[1-9][0-9]{0,9}$/;
const NUMBER_MAX = 2_147_483_647;

/** The issue a Start page is for: `owner/name` and its number, when the address names one; else null. */
export function learnStartIssueOf(
  owner: unknown,
  name: unknown,
  number: unknown,
): { repo: string; number: number } | null {
  if (typeof owner !== 'string' || typeof name !== 'string' || typeof number !== 'string') return null;
  if (!OWNER.test(owner) || !NAME.test(name) || name === '.' || name === '..' || !NUMBER.test(number)) return null;
  const value = Number(number);
  return value <= NUMBER_MAX ? { repo: `${owner}/${name}`, number: value } : null;
}

/** `repo` as `owner/name` the Start page takes, or null. */
export function learnStartRepoOf(repo: unknown): string | null {
  if (typeof repo !== 'string') return null;
  const [owner, name, ...rest] = repo.split('/');
  return !rest.length && learnStartIssueOf(owner, name, '1') ? repo : null;
}

/** An issue number the Start page takes, or null. */
export const learnStartNumberOf = (number: unknown): number | null =>
  typeof number === 'number' && Number.isInteger(number) && number > 0 && number <= NUMBER_MAX ? number : null;

/** The page's mode from its query: `?lesson=1` asks for a lesson, anything else is Fix it. */
export const startModeOf = (lesson: unknown): StartMode => (lesson === '1' ? 'lesson' : 'fix');

/**
 * Where the back link, and every refusal's "back to the issues", lead: Issues for you in Fix mode; in lesson mode the
 * tab the person came from (`?from=contribute`), else Learn's issues.
 */
export function startBackOf(mode: StartMode, from?: unknown): { href: Route; label: string } {
  if (mode === 'fix') return { href: PICK_ISSUE_PATHS.fix, label: 'Issues for you' };
  return {
    href: from === 'contribute' ? PICK_ISSUE_PATHS.fix : PICK_ISSUE_PATHS.learn,
    label: 'Back to the issues',
  };
}

/** The issue on GitHub. */
export const githubIssueUrlOf = (repo: string, number: number) => `https://github.com/${repo}/issues/${number}`;

const GITHUB_ISSUE_URL =
  /^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}\/issues\/[1-9][0-9]{0,9}$/;

/**
 * The issue's address: as GitHub's read spelled it when there was one (its owner and name in their own case), else
 * as the page's address names it.
 */
export const startIssueUrlOf = ({ start }: Pick<StartPageIssueView, 'start'>) =>
  start.issue?.url && GITHUB_ISSUE_URL.test(start.issue.url) && start.issue.number === start.number
    ? start.issue.url
    : githubIssueUrlOf(start.repo, start.number);

/** Names a sign-in may give besides the picker's: "Codex", "Gemini". */
const CLIENT_ALIASES: Partial<Record<McpClient, string>> = { codex: 'codex', 'gemini-cli': 'gemini' };
const keyOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The agent as its connection's name says, when it names one of the clients we set up: "Claude Code on macOS". */
export function mcpClientOfName(name: string | null | undefined): McpClient | null {
  const key = keyOf(name ?? '');
  if (!key) return null;
  return (
    MCP_CLIENTS.find((client) => {
      const alias = CLIENT_ALIASES[client];
      return key.startsWith(keyOf(MCP_CLIENT_NAMES[client])) || (alias !== undefined && key.startsWith(alias));
    }) ?? null
  );
}

/**
 * Whether the viewer's agent has called: an agent that signed in, or a personal token with a last use. A token made and
 * never used doesn't count. The connection named is the one used last.
 */
export function learnStartConnectionOf(tokens: ContributeMcpToken[] | undefined): LearnStartConnection | null {
  const live = (tokens ?? []).filter((token) => isSignedInAgent(token) || token.lastUsedAt);
  if (!live.length) return null;
  const at = (token: ContributeMcpToken) => (token.lastUsedAt ? Date.parse(token.lastUsedAt) || 0 : -1);
  const last = live.reduce((best, token) => (at(token) > at(best) ? token : best));
  return { client: mcpClientOfName(last.name), lastCallAt: last.lastUsedAt };
}

/** How far back a connection's use counts for the restart sentence. */
export const RESTART_HINT_DAYS = 30;

/**
 * Lesson mode's restart sentence: a connection used in the last 30 days whose tool list was last seen without GitRanks
 * Learn (`learnListed: false`). A connection the API says nothing about (an API without the field) never counts.
 */
export function restartHintOf(
  tokens: readonly { lastUsedAt: string | null; learnListed?: boolean | null }[] | null | undefined,
  now: Date,
): boolean {
  const since = now.getTime() - RESTART_HINT_DAYS * 86_400_000;
  return (tokens ?? []).some(
    (token) => token.learnListed === false && !!token.lastUsedAt && Date.parse(token.lastUsedAt) >= since,
  );
}

/** The agent in running text: its name, else "your agent". */
export const agentNameOf = (client: McpClient | null | undefined) => (client ? MCP_CLIENT_NAMES[client] : 'your agent');

/** "a moment ago" within the minute, else "3 hours ago". */
export function lastCallLabel(iso: string, now: Date): string {
  const age = now.getTime() - Date.parse(iso);
  return Number.isFinite(age) && age < 60_000 ? 'a moment ago' : relativeLabel(iso, now);
}

/**
 * Lesson mode: what step 3 says of a Fix attempt on the issue, by its state. From `SUBMITTING` on, its pull request is
 * a regular one, so the issue can't be a lesson: pick another.
 */
export function learnStartFixOf(state: ContributeAttemptState): { text: string; pickAnother: boolean } {
  switch (state) {
    case 'QUEUED':
    case 'CLAIMING':
      return { text: "Wait a moment: we're checking the issue.", pickAnother: false };
    case 'RUNNING':
      return { text: 'Ask your agent to release it, then paste the prompt again.', pickAnother: false };
    case 'CHECKS':
      return { text: 'Wait for its checks, then discard it on its page.', pickAnother: false };
    case 'REVIEW':
    case 'PENDING_AUTOSUBMIT':
      return { text: 'Discard it on its page, then paste the prompt again.', pickAnother: false };
    case 'SUBMITTING':
    case 'PR_OPEN':
    case 'FOLLOW_UP':
      return {
        text: "Your agent opened a regular pull request for this issue, so it can't be a lesson. Pick another issue.",
        pickAnother: true,
      };
    default:
      // An ended attempt is never answered here; a state this page doesn't know is said plainly.
      return { text: 'See where it is on its page.', pickAnother: false };
  }
}

/** Whether a refusal's limit is the one on open pull requests, which `LimitNotice` says. */
export const isOpenPrsLimit = (limit: string | null | undefined): boolean =>
  limit?.toLowerCase() === 'open_prs_at_a_time';

/** Steps 2 and 3 show with no refusal, and with `YOURS` (lesson mode words its Fix attempt in step 3). */
export const startStepsOpen = ({ start }: Pick<StartPageIssueView, 'start'>) =>
  start.refusal === null || start.refusal === 'YOURS';

/**
 * What the page does with the viewer's attempt on the issue: open its pull request's page (`open`; a lesson's shows its
 * lesson), or, in lesson mode, stay and word a Fix attempt (`fix`). Null: no attempt.
 */
export type StartClaim = { kind: 'open' | 'fix'; attempt: StartPageAttempt };

export function startClaimOf(attempt: StartPageAttempt | null | undefined, mode: StartMode): StartClaim | null {
  if (!attempt) return null;
  if (mode === 'lesson' && attempt.mode === 'FIX') return { kind: 'fix', attempt };
  return { kind: 'open', attempt };
}

/** The claim the answer names (`YOURS`), as `startClaimOf` decides it. */
export const startYoursOf = ({ start }: Pick<StartPageIssueView, 'start'>, mode: StartMode): StartClaim | null =>
  start.refusal === 'YOURS' ? startClaimOf(start.attempt, mode) : null;

/**
 * The pull request's page of the viewer's attempt on the issue, by repo and issue (the newest attempt's, which is the
 * one the page found): the repo as GitHub's read spells it when there was one. A lesson's page shows its lesson.
 */
export const startPullRequestPathOf = (
  ref: { repo: string; issue: number },
  view?: Pick<StartPageIssueView, 'start'> | null,
): Route => {
  const read = view?.start.issue;
  return pullRequestPath({ repo: read && read.number === ref.issue ? read.repo : ref.repo, issue: ref.issue });
};
