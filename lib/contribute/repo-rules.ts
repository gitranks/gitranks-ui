import type {
  ContributeConfigKey,
  ContributeIssueRepoRules,
  ContributeMaintainerConfigValue,
  ContributeRepoRuleCaps,
  ContributeRepoRuleKind,
  ContributeSettings,
} from './contribute.types';
import { CONFIG_FILE } from './maintainer-config';
import { fullDayLabel } from './maintainers-format';
import { TIER_NAMES } from '@/app/app.consts';

/** A repo with no rules, on the issue card and the attempt page. */
export const RULES_NONE = 'This repo sets no rules for AI contributions beyond its CONTRIBUTING.';
/** The attempt page's second sentence for a repo with no rules. */
export const RULES_NONE_REVIEW = 'Every PR waits for your review.';
/** The line under the caps and autopilot in Settings. */
export const REPOS_ASK_LESS =
  'Repos can ask for less: their rules lower these caps and can turn autopilot off for their PRs.';

/** The rules that say autopilot never submits in a repo: one "autopilot off" in a summary. */
const AUTOPILOT_KINDS: readonly ContributeRepoRuleKind[] = ['AUTOPILOT', 'NO_AUTONOMOUS'];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * The closed issue card's line after "This repo's rules": `autopilot off` where a person submits every PR, then how
 * many rules more (`2 more`), or how many there are (`3 rules`). Empty for a repo with none.
 */
export function rulesSummaryOf(rules: ContributeIssueRepoRules): string[] {
  const autopilot = rules.manualOnly ? rules.lines.filter(({ kind }) => AUTOPILOT_KINDS.includes(kind)).length : 0;
  const rest = rules.lines.length - autopilot;
  if (!rules.manualOnly) return rest ? [plural(rest, 'rule', 'rules')] : [];
  return rest ? ['autopilot off', `${rest} more`] : ['autopilot off'];
}

/** One size limit the attempt runs under: the repo's (with `yours` beside it) or the user's own. */
export type CapRow = {
  id: 'lines' | 'files';
  label: string;
  value: number;
  /** Where the repo's limit comes from, in words; null when the limit is the user's own. */
  source: string | null;
  /** The user's own limit beside the repo's; null when it is theirs, or not known. */
  yours: number | null;
};

/** The effective caps as rows, the repo's beside the user's setting (`settings`, when known). */
export function capRowsOf(
  caps: ContributeRepoRuleCaps,
  settings: Pick<ContributeSettings, 'maxChangedLines' | 'maxFiles'> | null | undefined,
): CapRow[] {
  const row = (id: CapRow['id'], label: string, value: number, source: string | null, own: number | undefined) => ({
    id,
    label,
    value,
    source,
    yours: source && typeof own === 'number' && own !== value ? own : null,
  });
  return [
    row('lines', 'Changed lines', caps.lines, caps.linesSource, settings?.maxChangedLines),
    row('files', 'Files', caps.files, caps.filesSource, settings?.maxFiles),
  ];
}

// ─── "Your repos": a key's control ────────────────────────────────────────────────────────────────────────────────────

/** A key's value left to the docs (nothing set on the page), as the pills and the select name it. */
export const UNSET = 'unset';

type Field = { label: string; hint?: string; placeholder?: string; words?: Record<string, string> };

/** The page's words for each key it knows; another key shows by its name. */
const FIELDS: Record<string, Field> = {
  autopilot: { label: 'Autopilot', words: { allowed: 'Allowed', off: 'Off' } },
  beginner_issues: { label: 'Good first issues', words: { yes: 'Open to us', no: 'People only' } },
  max_open_prs: { label: 'Our open PRs at once', hint: 'All contributors together.', placeholder: 'No limit' },
  max_changed_lines: { label: 'Changed lines per PR', placeholder: 'Contributor’s own' },
  max_files: { label: 'Files per PR', placeholder: 'Contributor’s own' },
  min_account_age_years: {
    label: 'GitHub account age, in years',
    hint: 'Only accounts at least this old open PRs here.',
    placeholder: 'Any age',
  },
  min_rank: { label: 'GitRanks tier', hint: 'Only this tier and above open PRs here.' },
  contact: {
    label: 'Contact',
    hint: 'An email or an https link where we can reach you about our PRs. Only this repo’s maintainers see it.',
    placeholder: 'An email or an https link',
  },
};

const KIND_VALUES: Record<string, string[]> = {
  onOff: ['on', 'off'],
  yesNo: ['yes', 'no'],
  allowedOff: ['allowed', 'off'],
};

const capitalized = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

export type ConfigOption = { value: string; label: string };

/** How a key is set on "Your repos", by its kind; null for a kind the page does not know (it is left out). */
export type ConfigControl = { key: string; label: string; hint?: string } & (
  | { type: 'pills'; options: ConfigOption[] }
  | { type: 'select'; options: ConfigOption[] }
  | { type: 'number'; min: number | null; max: number | null; placeholder: string }
  | { type: 'text'; placeholder: string }
);

export function configControlOf(key: ContributeConfigKey): ConfigControl | null {
  const field = FIELDS[key.key] ?? { label: key.key };
  const base = { key: key.key, label: field.label, ...(field.hint ? { hint: field.hint } : {}) };
  const values = KIND_VALUES[key.kind];
  if (values) {
    const options = values.map((value) => ({ value, label: field.words?.[value] ?? capitalized(value) }));
    return { ...base, type: 'pills', options: [{ value: UNSET, label: 'As your docs say' }, ...options] };
  }
  if (key.kind === 'tier') {
    const tiers = TIER_NAMES.map((name) => ({ value: name.toLowerCase(), label: `${name} and above` }));
    return { ...base, type: 'select', options: [{ value: UNSET, label: 'Anyone' }, ...tiers] };
  }
  if (key.kind === 'int') {
    return { ...base, type: 'number', min: key.min, max: key.max, placeholder: field.placeholder ?? 'Not set' };
  }
  if (key.kind === 'contact') return { ...base, type: 'text', placeholder: field.placeholder ?? '' };
  return null;
}

/** The keys "Your repos" sets: live ones the page may set, in the API's order, each with a control. */
export const pageControlsOf = (keys: ContributeConfigKey[]): ConfigControl[] =>
  keys
    .filter(({ live, page }) => live && page)
    .map(configControlOf)
    .filter((control): control is ConfigControl => !!control);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Why a typed value can't be saved, in words; null when it can (empty clears the page's value). The API checks again:
 * this only saves a round trip.
 */
export function configDraftErrorOf(control: ConfigControl, draft: string): string | null {
  const value = draft.trim();
  if (!value) return null;
  if (control.type === 'number') {
    const number = Number(value);
    const { min, max } = control;
    const range = min !== null && max !== null ? `${min} to ${max}` : null;
    if (!/^\d+$/.test(value) || (min !== null && number < min) || (max !== null && number > max)) {
      return range ? `A whole number from ${range}.` : 'A whole number.';
    }
  }
  if (control.type === 'text') {
    if (value.length > 200) return 'At most 200 characters.';
    if (!EMAIL.test(value) && !/^https:\/\/\S+$/.test(value)) return 'An email or a link starting with https://.';
  }
  return null;
}

/** Where a key's value comes from, under its control: the file (locked), who set it here, or a value we skipped. */
export function configNoteOf(value: ContributeMaintainerConfigValue | undefined): string | null {
  if (!value) return null;
  if (value.source === 'FILE') {
    const read = fullDayLabel(value.fileReadAt);
    return `Set in ${CONFIG_FILE}${read ? ` (read ${read})` : ''}. Change it there.`;
  }
  const skipped = value.ignoredRaw
    ? `${CONFIG_FILE} has “${value.key}: ${value.ignoredRaw}”, which it doesn’t take, so we skipped it.`
    : null;
  const by = value.source === 'PAGE' && value.setBy ? `Set by @${value.setBy} on this page.` : null;
  return [by, skipped].filter(Boolean).join(' ') || null;
}

/** When the repo's file was last read, from any of its keys; null before the first read. */
export const fileReadAtOf = (config: ContributeMaintainerConfigValue[]): string | null =>
  config.find(({ fileReadAt }) => fileReadAt)?.fileReadAt ?? null;
