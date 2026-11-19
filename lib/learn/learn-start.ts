import type { Route } from 'next';

import type { LearnProfile } from './learn.types';
import { LEARN_PATH, MY_LESSONS_PATH } from './learn-path';
import type { LearnStartView } from './learn-start.types';
import { LEVELS } from './profile-form';
import type { ContributeAttemptState, ContributeMcpToken } from '@/lib/workspace/contribute.types';
import { relativeLabel } from '@/lib/workspace/format';
import { MCP_CLIENT_NAMES, MCP_CLIENTS, type McpClient } from '@/lib/workspace/mcp-setup';
import { isSignedInAgent } from '@/lib/workspace/oauth-consent';
import { learnAttemptPath, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { attemptPath } from '@/lib/workspace/sessions';

/** The start page of a lesson for one issue: `/learn/start/<owner>/<repo>/<number>`. */

/** Learn home's issues, where every "back to the issues" goes. */
export const LEARN_ISSUES_PATH = `${LEARN_PATH}#issues` as Route;
/** The pull requests, where `LIMIT_REACHED` on attempts at a time sends the viewer. */
export const MY_CONTRIBUTIONS_PATH: Route = WORKSPACE_PATHS.pullRequests;

/** How often step 3 asks whether the agent has taken the issue, while the page is shown. */
export const LEARN_START_POLL_MS = 5_000;
/** Step 3 asks for at most this long of the page being shown, then says so and offers Check again. */
export const LEARN_START_POLL_FOR_MS = 30 * 60_000;

/** A GitHub owner: letters, digits and hyphens, up to 39 characters. */
const OWNER = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
/** A GitHub repository's name: letters, digits, `.`, `_` and `-`, up to 100 characters; never `.` or `..`. */
const NAME = /^[A-Za-z0-9._-]{1,100}$/;
const NUMBER = /^[1-9][0-9]{0,9}$/;
const NUMBER_MAX = 2_147_483_647;

/** The issue a start page is for: `owner/name` and its number, when the address names one; else null. */
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

/** `repo` as `owner/name` the start page takes, or null. */
export function learnStartRepoOf(repo: unknown): string | null {
  if (typeof repo !== 'string') return null;
  const [owner, name, ...rest] = repo.split('/');
  return !rest.length && learnStartIssueOf(owner, name, '1') ? repo : null;
}

/** An issue number the start page takes, or null. */
export const learnStartNumberOf = (number: unknown): number | null =>
  typeof number === 'number' && Number.isInteger(number) && number > 0 && number <= NUMBER_MAX ? number : null;

/** The start page of a lesson for an issue of `repo` (`owner/name`). */
export function learnStartPath(repo: string, number: number): Route {
  const [owner, name] = repo.split('/');
  return `/learn/start/${encodeURIComponent(owner)}/${encodeURIComponent(name ?? '')}/${number}` as Route;
}

/** The issue on GitHub. */
export const githubIssueUrlOf = (repo: string, number: number) => `https://github.com/${repo}/issues/${number}`;

const GITHUB_ISSUE_URL =
  /^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}\/issues\/[1-9][0-9]{0,9}$/;

/**
 * The issue's address: as GitHub's read spelled it when there was one (its owner and name in their own case), else
 * as the page's address names it.
 */
export const learnStartIssueUrlOf = ({ start }: Pick<LearnStartView, 'start'>) =>
  start.issue?.url && GITHUB_ISSUE_URL.test(start.issue.url) && start.issue.number === start.number
    ? start.issue.url
    : githubIssueUrlOf(start.repo, start.number);

/** The one prompt step 2 gives the agent: the issue's address and "GitRanks Learn", so it claims in Learn mode. */
export const learnStartPromptOf = (issueUrl: string) => `Fix ${issueUrl} with GitRanks Learn and teach me`;

/** "TypeScript, Some": the saved goal and, for a language, its level. Null without a goal. */
export function learnGoalLabelOf(profile: LearnProfile | null | undefined): string | null {
  const value = profile?.goalValue?.trim();
  if (!profile?.goalKind || !value) return null;
  if (profile.goalKind !== 'LANGUAGE') return value;
  const key = value.toLowerCase();
  const level = profile.levels.find((row) => row.language.trim().toLowerCase() === key)?.level ?? 0;
  return `${value}, ${LEVELS[Math.min(LEVELS.length - 1, Math.max(0, Math.round(level)))]}`;
}

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

/** Step 1 done: which agent, and when it last called (null for a sign-in that has not called since). */
export type LearnStartConnection = { client: McpClient | null; lastCallAt: string | null };

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

/** The agent in running text: its name, else "your agent". */
export const agentNameOf = (client: McpClient | null | undefined) => (client ? MCP_CLIENT_NAMES[client] : 'your agent');

/** "a moment ago" within the minute, else "3 hours ago". */
export function lastCallLabel(iso: string, now = new Date()): string {
  const age = now.getTime() - Date.parse(iso);
  return Number.isFinite(age) && age < 60_000 ? 'a moment ago' : relativeLabel(iso, now);
}

/** A Fix attempt's page on Contribute. */
export const fixAttemptPath = (attemptId: string): Route => attemptPath(attemptId);

/**
 * What step 3 says of a Fix attempt on the issue, by its state. From `SUBMITTING` on, its pull request is a regular
 * one, so the issue can't be a lesson: pick another.
 */
export function learnStartFixOf(state: ContributeAttemptState): { text: string; pickAnother: boolean } {
  switch (state) {
    case 'QUEUED':
    case 'CLAIMING':
      return { text: "Wait a moment: we're checking the claim.", pickAnother: false };
    case 'RUNNING':
      return { text: 'Ask your agent to release it, then paste the prompt again.', pickAnother: false };
    case 'CHECKS':
      return { text: 'Wait for its checks, then discard it on its Contribute page.', pickAnother: false };
    case 'REVIEW':
    case 'PENDING_AUTOSUBMIT':
      return { text: 'Discard it on its Contribute page, then paste the prompt again.', pickAnother: false };
    case 'SUBMITTING':
    case 'PR_OPEN':
    case 'FOLLOW_UP':
      return {
        text: "Your agent opened a regular pull request for this issue, so it can't be a lesson. Pick another issue.",
        pickAnother: true,
      };
    default:
      // An ended attempt is never answered here; a state this page doesn't know is said plainly.
      return { text: 'See where it is on its Contribute page.', pickAnother: false };
  }
}

/**
 * The words for a limit that leaves no room for a new lesson, and where what holds it shows: the open pull requests
 * (`count`: how many may be open, when known) or, for any other limit, the attempts at a time. The start page's
 * `LIMIT_REACHED` and Learn home's issues say the same.
 */
export function learnLimitWordsOf(
  limit: string | null | undefined,
  count?: number | null,
): { text: string; link: { href: Route; label: string } } {
  if (limit?.toLowerCase() === 'open_prs_at_a_time') {
    const who = count ? `${count} of your pull requests ${count === 1 ? 'is' : 'are'}` : 'Your open pull requests are';
    return {
      text: `${who} waiting on maintainers. A new lesson can start when one is merged or closed.`,
      link: { href: MY_LESSONS_PATH, label: 'My lessons' },
    };
  }
  return {
    text: 'Your agent is working on another issue. A new lesson can start when that one is done.',
    link: { href: MY_CONTRIBUTIONS_PATH, label: 'Pull requests' },
  };
}

/** A refusal's words and where it leads; `paused` uses Contribute's own notice. */
export type LearnStartRefusalCopy =
  | { kind: 'paused' }
  | { kind: 'notice'; text: string; action: { href: Route; label: string } | null };

const BACK = { href: LEARN_ISSUES_PATH, label: 'Back to the issues' };

/** What the page says for its refusal; null for none, and for `YOURS`, which goes on to the attempt. */
export function learnStartRefusalOf({ start, current, openPrs }: LearnStartView): LearnStartRefusalCopy | null {
  const notice = (text: string, action: { href: Route; label: string } | null = BACK): LearnStartRefusalCopy => ({
    kind: 'notice',
    text,
    action,
  });
  switch (start.refusal) {
    case null:
    case 'YOURS':
      return null;
    case 'OWN_IN_PROGRESS': {
      const name = current?.title ?? (current?.repo ? `${current.repo}#${current.issueNumber}` : null);
      return notice(
        `${name ? `Your lesson on “${name}” is` : 'Another lesson of yours is'} in progress. One lesson of your own at a time: this one can start once that one is done.`,
        current
          ? { href: learnAttemptPath(current.attemptId), label: 'Back to your lesson' }
          : { href: MY_LESSONS_PATH, label: 'My lessons' },
      );
    }
    case 'ACCOUNT_PAUSED':
      return { kind: 'paused' };
    case 'LIMIT_REACHED': {
      const words = learnLimitWordsOf(start.limit, openPrs);
      return notice(words.text, words.link);
    }
    case 'DAILY_LIMIT':
      return notice("You've taken today's claims. Try again tomorrow.", null);
    case 'UNAVAILABLE':
      return notice("This issue can't be started here.");
    case 'TAKEN':
      return notice("Someone else's agent took this issue.");
    case 'CLOSED':
      return notice('This issue was closed meanwhile.');
    case 'REPO_UNAVAILABLE':
      return notice("This project can't take a pull request from us right now.");
    default:
      return notice("This issue can't be started here.");
  }
}

/** Steps 2 and 3 show with no refusal, and with `YOURS` (its Fix attempt is worded in step 3). */
export const learnStartStepsOpen = ({ start }: Pick<LearnStartView, 'start'>) =>
  start.refusal === null || start.refusal === 'YOURS';

/** The viewer's Fix attempt the answer names (`YOURS`); a Learn attempt goes on to its page instead. */
export const learnStartFixAttemptOf = ({ start }: Pick<LearnStartView, 'start'>) =>
  start.refusal === 'YOURS' && start.attempt?.mode === 'FIX' ? start.attempt : null;

/** The viewer's Learn attempt the answer names (`YOURS`): the page goes on to its lesson page. */
export const learnStartLessonAttemptOf = ({ start }: Pick<LearnStartView, 'start'>) =>
  start.refusal === 'YOURS' && start.attempt?.mode === 'LEARN' ? start.attempt : null;
