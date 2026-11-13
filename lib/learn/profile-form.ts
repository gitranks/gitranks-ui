import type { LearnFocus, LearnGoalKind, LearnLevel, LearnProfile, LearnProfileInput } from './learn.types';

/** The levels a language can have, from 0. */
export const LEVELS = ['New to it', 'Some', 'Comfortable', 'Expert'] as const;
export const LEVEL_MAX = LEVELS.length - 1;

/** The goals the page offers; a domain only for a user whose saved goal is one (see `goalKindsOf`). */
export const GOALS: Record<LearnGoalKind, { title: string; text: string }> = {
  LANGUAGE: {
    title: 'A language',
    text: 'Issues in projects written in it. Lessons explain the language features the fix uses.',
  },
  DOMAIN: {
    title: 'A domain',
    text: 'Web frontends, databases, compilers, developer tools and more. Lessons explain the ideas behind the fix.',
  },
  PROJECT: {
    title: 'How one project works',
    text: 'Issues in a project you choose. Lessons explain its structure and patterns.',
  },
};

/** What lessons can focus on, in the page's order. */
export const FOCUS: { value: LearnFocus; label: string }[] = [
  { value: 'LANGUAGE', label: 'How the language works' },
  { value: 'STRUCTURE', label: 'How the project is organised' },
  { value: 'PATTERNS', label: 'Patterns the project uses' },
  { value: 'TESTS', label: 'Tests and tooling' },
];

/** Languages offered as a goal after the user's own, so a user with no public work can still pick one. */
export const COMMON_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'Kotlin',
  'C#',
  'C++',
  'C',
  'PHP',
  'Ruby',
  'Swift',
] as const;

/** The form as the user edits it. The language and the project are kept apart, so switching goals loses neither. */
export type LearnProfileForm = {
  goalKind: LearnGoalKind | null;
  language: string;
  project: string;
  /** The saved domain, kept as it is: the page offers no domains to pick from. */
  domain: string | null;
  levels: LearnLevel[];
  focus: LearnFocus[];
};

const clampLevel = (level: number) =>
  Number.isFinite(level) ? Math.min(LEVEL_MAX, Math.max(0, Math.round(level))) : 0;

/** The form for a saved profile; an empty one (no goal yet) without it. */
export function formOf(profile: LearnProfile | null | undefined): LearnProfileForm {
  const kind = profile?.goalKind ?? null;
  const value = profile?.goalValue?.trim() ?? '';
  const seen = new Set<string>();
  const levels = (profile?.levels ?? []).flatMap((row) => {
    const language = row.language.trim();
    const key = language.toLowerCase();
    if (!language || seen.has(key)) return [];
    seen.add(key);
    return [{ ...row, language, level: clampLevel(row.level) }];
  });
  return {
    goalKind: kind,
    language: kind === 'LANGUAGE' ? value : '',
    project: kind === 'PROJECT' ? value : '',
    domain: kind === 'DOMAIN' && value ? value : null,
    levels,
    focus: FOCUS.map(({ value: focus }) => focus).filter((focus) => profile?.focus?.includes(focus)),
  };
}

/** The goals the page shows: a domain only when it is the saved goal, since there are no domains to pick yet. */
export const goalKindsOf = (form: Pick<LearnProfileForm, 'domain'>): LearnGoalKind[] =>
  form.domain ? ['LANGUAGE', 'DOMAIN', 'PROJECT'] : ['LANGUAGE', 'PROJECT'];

/** The languages the goal's list offers: the user's own first (as the API orders them), then the common ones. */
export function languageChoicesOf(form: Pick<LearnProfileForm, 'levels' | 'language'>): string[] {
  const seen = new Set<string>();
  const choices: string[] = [];
  for (const language of [form.language, ...form.levels.map((row) => row.language), ...COMMON_LANGUAGES]) {
    const key = language.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    choices.push(language.trim());
  }
  return choices;
}

/** The goal's language when the goal is a language. */
const goalLanguageOf = (form: Pick<LearnProfileForm, 'goalKind' | 'language'>) =>
  form.goalKind === 'LANGUAGE' && form.language.trim() ? form.language.trim() : null;

export type LevelRow = LearnLevel & { goal: boolean; note: string | null };

/**
 * The level rows the page shows: the goal's language first ("Your goal"), added at New to it when the user has no
 * level for it, then the rest in the API's order. `note` is the line under the name.
 */
export function levelRowsOf(form: Pick<LearnProfileForm, 'goalKind' | 'language' | 'levels'>): LevelRow[] {
  const goal = goalLanguageOf(form);
  const key = goal?.toLowerCase();
  const own = key ? form.levels.find((row) => row.language.toLowerCase() === key) : undefined;
  const goalRow: LearnLevel | null = goal ? (own ?? { language: goal, level: 0, guessed: false, hint: null }) : null;
  const rest = form.levels.filter((row) => row !== own);
  const rows = goalRow ? [goalRow, ...rest] : rest;
  return rows.map((row) => {
    const isGoal = row === goalRow;
    const note = [isGoal ? 'Your goal' : null, row.hint?.trim() || null].filter(Boolean).join(' · ');
    return { ...row, goal: isGoal, note: note || null };
  });
}

/** The form with a language's level set by the user: no longer a guess. A language not listed yet is added. */
export function withLevel(form: LearnProfileForm, language: string, level: number): LearnProfileForm {
  const key = language.trim().toLowerCase();
  const next = clampLevel(level);
  const listed = form.levels.some((row) => row.language.toLowerCase() === key);
  const levels = listed
    ? form.levels.map((row) => (row.language.toLowerCase() === key ? { ...row, level: next, guessed: false } : row))
    : [...form.levels, { language: language.trim(), level: next, guessed: false, hint: null }];
  return { ...form, levels };
}

/** The form with a focus ticked or unticked, kept in the page's order. */
export function withFocus(form: LearnProfileForm, focus: LearnFocus, on: boolean): LearnProfileForm {
  const picked = new Set(form.focus);
  if (on) picked.add(focus);
  else picked.delete(focus);
  return { ...form, focus: FOCUS.map(({ value }) => value).filter((value) => picked.has(value)) };
}

const REPO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

/**
 * A project as `owner/repo`, from what the user typed: the name itself, or its GitHub address. Null when it is
 * neither.
 */
export function projectOf(typed: string): string | null {
  let text = typed.trim();
  const url = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/([^/?#\s]+)/i.exec(text);
  if (url) text = `${url[1]}/${url[2]}`;
  text = text.replace(/\.git$/i, '').replace(/\/+$/, '');
  return REPO.test(text) && !text.endsWith('/.') && !text.endsWith('/..') ? text : null;
}

/** Why the form cannot be saved yet, as the page says it; null when it can. */
export function formProblemOf(form: LearnProfileForm): string | null {
  switch (form.goalKind) {
    case null:
      return 'Pick what you want to learn.';
    case 'LANGUAGE':
      return form.language.trim() ? null : 'Pick a language.';
    case 'PROJECT':
      if (!form.project.trim()) return 'Name the project, as owner/repo.';
      return projectOf(form.project) ? null : 'Name the project as owner/repo, for example vercel/next.js.';
    case 'DOMAIN':
      return form.domain ? null : 'Pick what you want to learn.';
    default:
      return 'Pick what you want to learn.';
  }
}

/**
 * What Save sends: the goal, every level the page shows (the goal's language included), and the focus. Null while the
 * form has a problem (`formProblemOf`).
 */
export function inputOf(form: LearnProfileForm): LearnProfileInput | null {
  if (formProblemOf(form) || !form.goalKind) return null;
  const goalValue =
    form.goalKind === 'LANGUAGE'
      ? form.language.trim()
      : form.goalKind === 'PROJECT'
        ? (projectOf(form.project) as string)
        : (form.domain as string);
  return {
    goalKind: form.goalKind,
    goalValue,
    levels: levelRowsOf(form).map(({ language, level }) => ({ language, level })),
    focus: [...form.focus],
  };
}

const GOAL_KINDS: readonly LearnGoalKind[] = ['LANGUAGE', 'DOMAIN', 'PROJECT'];
const TEXT_MAX = 200;
const LEVELS_MAX = 50;

const textOf = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text.length <= TEXT_MAX ? text : null;
};

/**
 * The profile as the API takes it, from whatever the browser sent: a known goal with its value (a project as
 * `owner/repo`), at most 50 levels from 0 to 3 with one per language, and known focus values once each. Null when any
 * part is not.
 */
export function cleanProfileInput(input: unknown): LearnProfileInput | null {
  if (!input || typeof input !== 'object') return null;
  const { goalKind, goalValue, levels, focus } = input as Record<string, unknown>;
  if (typeof goalKind !== 'string' || !GOAL_KINDS.includes(goalKind as LearnGoalKind)) return null;
  const kind = goalKind as LearnGoalKind;
  const typed = textOf(goalValue);
  const value = kind === 'PROJECT' && typed ? projectOf(typed) : typed;
  if (!value) return null;
  if (!Array.isArray(levels) || levels.length > LEVELS_MAX || !Array.isArray(focus)) return null;
  const seen = new Set<string>();
  const cleanLevels: LearnProfileInput['levels'] = [];
  for (const row of levels) {
    const language = textOf((row as Record<string, unknown> | null)?.language);
    const level = (row as Record<string, unknown> | null)?.level;
    if (!language || typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > LEVEL_MAX) {
      return null;
    }
    if (seen.has(language.toLowerCase())) continue;
    seen.add(language.toLowerCase());
    cleanLevels.push({ language, level });
  }
  const known = FOCUS.map(({ value: item }) => item);
  if (focus.some((item) => !known.includes(item as LearnFocus))) return null;
  return {
    goalKind: kind,
    goalValue: value,
    levels: cleanLevels,
    focus: known.filter((item) => focus.includes(item)),
  };
}
