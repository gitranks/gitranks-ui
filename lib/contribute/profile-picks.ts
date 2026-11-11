import type { AgentPageIssue } from './agent-page.types';
import type { ContributeIssue, ContributeLanguage } from './contribute.types';
import { LANGUAGES } from './format';

/**
 * Contribute on a profile whose owner has not connected: three ready issues matched to the profile. A visitor sees its
 * main language's picks of the day (the same for everyone); the signed-in owner sees their own.
 */

/** The pool's numbers the block names; null when the API could not read them. */
export type ProfilePicksStats = { screenedRepos: number; issuesRead: number; readyIssues: number };

/** One pick: a public issue of the day, and for the owner why it is theirs. */
export type ProfilePick = AgentPageIssue & { fit?: 'contributed' | 'language' | string };

/** `GET /api/contribute/language-picks?language=`: a language's picks of the day, the same for everyone. */
export type LanguagePicksAnswer = { issues: ProfilePick[]; stats: ProfilePicksStats | null };

/** `GET /api/me/contribute/profile-block?login=`: what the owner's own profile shows them. */
export type OwnProfileBlockAnswer =
  | { kind: 'contributor'; issues: ContributeIssue[] }
  | { kind: 'own'; issues: ProfilePick[]; stats: ProfilePicksStats | null }
  | { kind: 'none' };

export const LANGUAGE_PICKS_PATH = '/api/contribute/language-picks';
export const OWN_PROFILE_BLOCK_PATH = '/api/me/contribute/profile-block';

/** GitHub's language names as the pool counts them; any other name is no pool language. */
const POOL_LANGUAGES: Readonly<Record<string, ContributeLanguage>> = {
  javascript: 'JS_TS',
  typescript: 'JS_TS',
  python: 'PYTHON',
  go: 'GO',
  rust: 'RUST',
  java: 'JAVA',
  php: 'PHP',
  ruby: 'RUBY',
};

export const POOL_LANGUAGE_VALUES = Object.keys(LANGUAGES) as ContributeLanguage[];

export const isPoolLanguage = (value: string | null | undefined): value is ContributeLanguage =>
  !!value && (POOL_LANGUAGE_VALUES as string[]).includes(value);

/** A profile's main pool language and the name GitHub gives it ("TypeScript"); null when it writes none of them. */
export type ProfileLanguage = { language: ContributeLanguage; name: string };

/**
 * The profile's main pool language: the first of its owned repos' top 3 languages the pool holds issues in, else of its
 * contributed repos' top 3. Null when neither has one: the profile shows no block.
 */
export function profileLanguageOf(
  owned: readonly { name?: string | null }[] | null | undefined,
  contributed: readonly { name?: string | null }[] | null | undefined,
): ProfileLanguage | null {
  for (const { name } of [...(owned ?? []).slice(0, 3), ...(contributed ?? []).slice(0, 3)]) {
    const language = name ? POOL_LANGUAGES[name.trim().toLowerCase()] : undefined;
    if (language && name) return { language, name: name.trim() };
  }
  return null;
}

export const languagePicksUrl = (language: ContributeLanguage) =>
  `${LANGUAGE_PICKS_PATH}?language=${encodeURIComponent(language)}`;

/** The API's pool language (`js-ts`) as the UI names it (`JS_TS`); null for any other. */
export const uiLanguageOf = (language: string | null | undefined): ContributeLanguage | null => {
  const value = language?.toUpperCase().replace(/[^A-Z0-9]+/g, '_') ?? null;
  return isPoolLanguage(value) ? value : null;
};

const WHY_FIT = {
  contributed: () => 'You contributed to this repository',
  language: (language: ContributeLanguage | null) => (language ? `Your language: ${LANGUAGES[language]}` : null),
} as const;

/** A pick as a compact card shows it: where, what, and why (for the owner, why it is theirs first). */
export function cardOfPick(pick: ProfilePick): ContributeIssue {
  const language = uiLanguageOf(pick.language);
  const fit =
    pick.fit === 'contributed' ? WHY_FIT.contributed() : pick.fit === 'language' ? WHY_FIT.language(language) : null;
  return {
    issueId: `${pick.repo}#${pick.number}`,
    repositoryId: pick.repo,
    nameWithOwner: pick.repo,
    number: pick.number,
    url: pick.url,
    title: pick.title,
    labels: pick.labels,
    language,
    kind: null,
    size: pick.size === 'S' || pick.size === 'M' || pick.size === 'L' ? pick.size : null,
    score: 0,
    rank: 0,
    why: [fit, ...pick.why].filter(Boolean).join(' · '),
  };
}

/** "your TypeScript, Go and Rust" (or "repos you contributed to and your Go"): what the owner's picks were matched to. */
export function ownMatchOf(picks: readonly ProfilePick[]): string {
  const languages = [
    ...new Set(
      picks.flatMap((pick) => {
        const language = pick.fit === 'language' ? uiLanguageOf(pick.language) : null;
        return language ? [LANGUAGES[language]] : [];
      }),
    ),
  ];
  const list = languages.length > 1 ? `${languages.slice(0, -1).join(', ')} and ${languages.at(-1)}` : languages[0];
  const contributed = picks.some((pick) => pick.fit === 'contributed');
  if (contributed) return list ? `repos you contributed to and your ${list}` : 'repos you contributed to';
  return list ? `your ${list}` : 'you';
}
