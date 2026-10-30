import { formatDistanceStrict } from 'date-fns';

import type {
  ContributeClaudePlan,
  ContributeComingSoonProvider,
  ContributeEffort,
  ContributeIssueKind,
  ContributeIssueSize,
  ContributeLanguage,
  ContributeModel,
  ContributePace,
} from './contribute.types';

export const LANGUAGES: Record<ContributeLanguage, string> = {
  JS_TS: 'JavaScript / TypeScript',
  PYTHON: 'Python',
  GO: 'Go',
  RUST: 'Rust',
  JAVA: 'Java',
  PHP: 'PHP',
  RUBY: 'Ruby',
};

export const KINDS: Record<ContributeIssueKind, string> = {
  BUG: 'Bugs',
  FEATURE: 'Small features',
  DOCS: 'Docs',
  TESTS: 'Tests',
  REFACTOR: 'Refactoring',
  PERFORMANCE: 'Performance',
};

export const KIND_ONE: Record<ContributeIssueKind, string> = {
  BUG: 'bug',
  FEATURE: 'feature',
  DOCS: 'docs',
  TESTS: 'tests',
  REFACTOR: 'refactor',
  PERFORMANCE: 'performance',
};

/** A label that says an issue suits a first contribution. */
export const GOOD_FIRST_LABEL = /good.first|beginner|easy|starter/i;

export const SIZES: Record<ContributeIssueSize, string> = { S: 'Small', M: 'Medium', L: 'Large' };

export const MODELS: Record<ContributeModel, string> = {
  CLAUDE_SONNET_5_5: 'Claude Sonnet 5.5',
  CLAUDE_OPUS_5_5: 'Claude Opus 5.5',
  CLAUDE_HAIKU_5_5: 'Claude Haiku 5.5',
};

export const EFFORTS: Record<ContributeEffort, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  XHIGH: 'Extra high',
  MAX: 'Max',
};

export const PACES: Record<ContributePace, { title: string; text: string }> = {
  EVEN: { title: 'Even, then a final sweep', text: "Spread across the cycle; use what's left before it expires" },
  FAST: { title: 'As fast as possible', text: 'Work whenever good issues wait, until a limit stops it' },
  QUEUED: { title: 'Only issues I queue', text: 'Nothing starts unless you pick it' },
};

/** The plans the credits come from, with what each gives a month (null: the user says). */
export const PLANS: { plan: ContributeClaudePlan; title: string; text: string; creditUsd: number | null }[] = [
  { plan: 'MAX_5X', title: 'Max 5x', text: '$100 credits a month', creditUsd: 100 },
  { plan: 'MAX_20X', title: 'Max 20x', text: '$200 credits a month', creditUsd: 200 },
  { plan: 'TEAM_STANDARD', title: 'Team, Standard seat', text: '$20 a seat, pooled up to $500', creditUsd: 20 },
  { plan: 'TEAM_PREMIUM', title: 'Team, Premium seat', text: '$100 a seat, pooled up to $500', creditUsd: 100 },
  { plan: 'CREDITS', title: 'Credits I bought', text: 'You set the amount', creditUsd: null },
];

export const planOf = (plan: ContributeClaudePlan | null | undefined) => PLANS.find((entry) => entry.plan === plan);

/** What a coming-soon provider spends: a plan's allowance, a cloud agent's tasks, or an API key's credit. */
export type ComingSoonKind = 'Plan' | 'Cloud agent' | 'API key';

/** The providers shown as coming soon, in the order the landing shows them, each with its "Notify me". */
export const COMING_SOON: {
  provider: ContributeComingSoonProvider;
  /** The initials on the card's badge, for a provider without a mark. */
  mono: string;
  title: string;
  kind: ComingSoonKind;
  text: string;
}[] = [
  {
    provider: 'CHATGPT',
    mono: 'CG',
    title: 'ChatGPT plan',
    kind: 'Plan',
    text: 'Your Plus or Pro allowance, under a weekly cap you set',
  },
  {
    provider: 'COPILOT',
    mono: 'GC',
    title: 'GitHub Copilot',
    kind: 'Plan',
    text: 'Your monthly AI credits, before they reset on the 1st',
  },
  {
    provider: 'GEMINI',
    mono: 'GE',
    title: 'Gemini',
    kind: 'Plan',
    text: 'The credits that come with your Google AI plan',
  },
  {
    provider: 'CURSOR',
    mono: 'CU',
    title: 'Cursor',
    kind: 'Cloud agent',
    text: 'Cloud agents on your Cursor plan, no terminal needed',
  },
  {
    provider: 'JULES',
    mono: 'JU',
    title: 'Jules',
    kind: 'Cloud agent',
    text: "Jules' daily tasks, run on your own fork",
  },
  {
    provider: 'OPENAI',
    mono: 'OA',
    title: 'OpenAI API key',
    kind: 'API key',
    text: 'A project key with a hard monthly limit',
  },
  { provider: 'XAI', mono: 'XG', title: 'xAI Grok', kind: 'API key', text: 'An API key with a prepaid stop' },
  {
    provider: 'OPENROUTER',
    mono: 'OR',
    title: 'OpenRouter',
    kind: 'API key',
    text: 'One key for many models, with a daily or weekly limit',
  },
];

/** `$5`, `$63.40`: whole dollars without cents. */
export const usd = (amount: number) =>
  `$${Number.isInteger(amount) ? amount.toLocaleString('en-US') : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A number the user typed, `$` and spaces allowed; `undefined` when it is not one, `null` when empty. */
export function parseAmount(text: string): number | null | undefined {
  const cleaned = text.replace(/[$\s,]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** `Nov 14`, in UTC (the API's days are UTC days). */
export const dayLabel = (iso: string | null | undefined) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

/** `in about 2 hours`, `3 days ago`. */
export const relativeLabel = (iso: string | null | undefined, now = new Date()) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceStrict(date, now, { addSuffix: true, roundingMethod: 'round' });
};

/** `22 hours`: the time from now to `iso`, without "in" or "ago"; '' for a time not given or gone. */
export const timeLeftLabel = (iso: string | null | undefined, now = new Date()) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now.getTime()) return '';
  return formatDistanceStrict(date, now, { roundingMethod: 'round' });
};

/** `the 14th`. */
export const ordinalDay = (day: number) => {
  const tens = day % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10];
  return `the ${day}${suffix ?? 'th'}`;
};

/** `…k3Qa`. */
export const maskedKey = (last4: string) => `…${last4}`;

/** A long id, its head and tail: `wrkspc_01J…7HKf`. */
export const shortId = (id: string | null | undefined) =>
  !id ? '' : id.length > 14 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id;
