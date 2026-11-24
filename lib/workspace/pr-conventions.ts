/**
 * What a repo asks of a pull request, as the API reads it from the repo's config, checks and merged PRs, and the
 * checks the PR form runs on the title as the user types. The title check matches the API's own, so a title the form
 * lets through is never refused at Submit.
 */

export type ContributeTitleRule = {
  /** A bot or a workflow checks it: a title that fails it fails a check on the PR, and Submit is refused. */
  hard: boolean;
  source: string;
  types: string[] | null;
  scopes: string[] | null;
  requireScope: boolean;
  /** The repo's own title pattern, shown and never run (group 1 the type, 2 the scope); null: `type(scope): summary`. */
  pattern: string | null;
};

export type ContributeRepoConventions = {
  title: ContributeTitleRule | null;
  titleExamples: string[];
  template: { path: string; aiAsks: string[] } | null;
  changelog: { kind: 'FILE' | 'CHANGESETS' | 'FRAGMENTS'; path: string; required: boolean; source: string } | null;
  /**
   * An agreement to sign: a CLA, or a DCO signed like one. `signComment`: the comment that signs it, word for word,
   * posted on the PR by its author; `signUrl` then links the document to read. Both absent from an older API.
   */
  cla: {
    check: string;
    signUrl: string | null;
    agreement?: 'CLA' | 'DCO' | null;
    signComment?: string | null;
  } | null;
  dco: boolean;
  generated: string[];
  notes: string[];
  /** The repo's rules for AI agents: a prefix every title carries (`[AI]`), its template left for the human, 🤖. */
  titlePrefix?: string | null;
  templateByHuman?: boolean | null;
  agentMarker?: string | null;
};

export type ContributePrIssueKind = 'TITLE' | 'CHANGELOG' | 'TEMPLATE' | 'CLA';

/**
 * What the user fills on GitHub: the text to paste under `label` (a template's heading; `value` null: nothing drafted,
 * `note` says what to write), or a checklist line to tick or leave (`tick`). `note`: what to check first, or why.
 */
type ContributePrIssueField = {
  label: string;
  value: string | null;
  note: string | null;
  tick?: boolean | null;
};

export type ContributePrConventionIssue = {
  kind: ContributePrIssueKind;
  check: string | null;
  message: string;
  /** TITLE: the title the fix sets; CHANGELOG: the line it writes; CLA: where to sign; null: no one-click fix. */
  suggestion: string | null;
  /** Why the user sees it: what the repo asks, and why neither the agent nor GitRanks does it. Absent from an older API. */
  why?: string | null;
  /** What to do, in order. */
  steps?: string[] | null;
  /** What to fill on GitHub, section by section (a template the repo leaves to the user). */
  fields?: ContributePrIssueField[] | null;
  /** The repo's file that asks it. */
  source?: { label: string; url: string } | null;
};

/** A fix sent to the open PR: `SIGN_OFF` rewrites our commits with the user's DCO sign-off (a force-push). */
export type ContributePrFix = {
  kind: 'LINK' | 'CHANGELOG' | 'TITLE' | 'BODY' | 'SIGN_OFF';
  state: 'SENDING' | 'DONE' | 'FAILED';
  note: string | null;
  at: string;
};

/** The fixes the API makes on an open pull request; `CO_AUTHOR` adds the co-author line the project asks for. */
export const PR_FIX_KINDS = ['TITLE', 'BODY', 'CHANGELOG', 'SIGN_OFF', 'CO_AUTHOR'] as const;
export type ContributePrFixKind = (typeof PR_FIX_KINDS)[number];

/** What each fix does, in a few words. */
export const PR_FIX_WORDS: Record<ContributePrFix['kind'], string> = {
  LINK: 'Linking the changelog line to the pull request',
  CHANGELOG: 'Fixing the changelog line',
  TITLE: 'Retitling the pull request',
  BODY: 'Updating the description',
  SIGN_OFF: 'Signing off the commits',
};

/** The fields the attempt carries for them; each absent while the API does not answer it. */
export type ContributeConventionsFields = {
  conventions?: ContributeRepoConventions | null;
  prIssues?: ContributePrConventionIssue[];
  prTitle?: string | null;
  /** The PR's description as a fix last set it (without the footer); null while none did. */
  prBody?: string | null;
  prFix?: ContributePrFix | null;
};

/** `type(scope)!: subject`; the scope may be empty (`docs(): …`). */
const CONVENTIONAL = /^([A-Za-z][\w-]*)(?:\(([^()\r\n]*)\))?!?: \S.*$/;

const quoted = (items: readonly string[]) => items.map((item) => `\`${item}\``).join(', ');

function partsProblemOf(type: string, scope: string | undefined, rule: ContributeTitleRule): string | null {
  if (rule.types && !rule.types.includes(type))
    return `\`${type}\` is not one of the repo's types: ${quoted(rule.types)}.`;
  const scopes = (scope ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (rule.requireScope && !scopes.length) return `Add a scope: \`${type}(scope): …\`.`;
  const unknown = rule.scopes ? scopes.filter((item) => !rule.scopes?.includes(item)) : [];
  if (unknown.length && rule.scopes)
    return `\`${unknown[0]}\` is not one of the repo's scopes: ${quoted(rule.scopes)}.`;
  return null;
}

/** Only `https:` links from the repo's data. */
export const httpsOnly = (url: string | null | undefined): string | null =>
  url && /^https:\/\//i.test(url) ? url : null;

/** Why `title` fails `rule`, in words; null when it passes or there is no rule. */
export function titleProblemOf(title: string, rule: ContributeTitleRule | null | undefined): string | null {
  if (!rule) return null;
  const trimmed = title.trim();
  // The repo's own form is never run here: a stranger's regex can backtrack for seconds on a failing title. The API
  // never treats it as a rule it checks either; the repo's own action checks it on the pull request.
  if (rule.pattern) return null;
  const match = trimmed.match(CONVENTIONAL);
  if (!match) {
    const type = !rule.types || rule.types.includes('fix') ? 'fix' : rule.types[0];
    return `Use the repo's \`type(scope): summary\` form, for example \`${type}${rule.requireScope ? '(scope)' : ''}: short summary\`.`;
  }
  return partsProblemOf(match[1], match[2], rule);
}

/**
 * One leading WIP, draft or "do not merge" mark: `[WIP]`, `(draft)`, `WIP:`, `DNM - `, as the API reads it. A dash counts
 * only with spaces around it: `Draft-js: fix selection` and `WIP-limit: cap` are titles, not marks.
 */
const DRAFT_MARK =
  /^\s*(?:[[(](?:wip|draft|do[\s-]*not[\s-]*merge|dnm)[\])](?:\s*:|\s+[-–](?=\s))?|(?:wip|draft|dnm|do\s+not\s+merge)(?:\s*:|\s+[-–](?=\s)))\s*/i;

export const hasDraftMark = (title: string): boolean => DRAFT_MARK.test(title);

/** The added lines of a changelog file in the patch: what the PR adds to the repo's changelog. */
export function changelogLinesOf(patch: string | null | undefined, path: string | null | undefined): string[] {
  if (!patch) return [];
  const changelog =
    /(^|\/)(CHANGELOG|CHANGES|HISTORY)\.md$|^\.changeset\/[^/]+\.md$|^(changelog\.d|newsfragments|\.changes)\//i;
  const lines: string[] = [];
  let inFile = false;
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const file = line.match(/ b\/(.+)$/)?.[1] ?? '';
      // The repo's own place when it is known (a folder's path ends in `/`), else any changelog-like file.
      inFile = path ? (path.endsWith('/') ? file.startsWith(path) : file === path) : changelog.test(file);
    } else if (inFile && line.startsWith('+') && !line.startsWith('+++') && line.slice(1).trim()) {
      lines.push(line.slice(1));
    }
  }
  return lines;
}

/**
 * The line to show of what the change adds to the changelog: a list item or a sentence, never a changeset's
 * frontmatter (`---`, `"pkg": patch`) or a heading (`### Fixed`).
 */
export function entryLineOf(lines: readonly string[]): string | null {
  let frontmatter = false;
  const kept: string[] = [];
  for (const line of lines) {
    if (line.trim() === '---') {
      frontmatter = !frontmatter;
      continue;
    }
    if (!frontmatter && !/^\s*#/.test(line)) kept.push(line);
  }
  return kept.find((line) => /^\s*[-*+]\s/.test(line)) ?? kept[0] ?? null;
}

/** The PR number and URL placeholders the agent writes in the changelog line; filled in once the PR opens. */
export const fillPlaceholders = (line: string): string =>
  line.replaceAll('{{PR_NUMBER}}', '<number>').replaceAll('{{PR_URL}}', '<pull request URL>');
