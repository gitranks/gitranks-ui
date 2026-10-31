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
  /** The repo's own title pattern (group 1 the type, 2 the scope); null: `type(scope): summary`. */
  pattern: string | null;
};

export type ContributeRepoConventions = {
  title: ContributeTitleRule | null;
  titleExamples: string[];
  template: { path: string; aiAsks: string[] } | null;
  changelog: { kind: 'FILE' | 'CHANGESETS' | 'FRAGMENTS'; path: string; required: boolean; source: string } | null;
  cla: { check: string; signUrl: string | null } | null;
  dco: boolean;
  generated: string[];
  notes: string[];
};

export type ContributePrIssueKind = 'TITLE' | 'CHANGELOG' | 'TEMPLATE' | 'CLA';
export type ContributePrConventionIssue = {
  kind: ContributePrIssueKind;
  check: string | null;
  message: string;
  /** TITLE: the title the fix sets; CHANGELOG: the line it writes; CLA: where to sign; null: no one-click fix. */
  suggestion: string | null;
};

export type ContributePrFix = {
  kind: 'LINK' | 'CHANGELOG' | 'TITLE' | 'BODY';
  state: 'SENDING' | 'DONE' | 'FAILED';
  note: string | null;
  at: string;
};

export const PR_FIX_KINDS = ['TITLE', 'BODY', 'CHANGELOG'] as const;
export type ContributePrFixKind = (typeof PR_FIX_KINDS)[number];

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

/**
 * A pattern safe to run on every keystroke: none with a quantified group that holds a quantifier (`(\w+\s?)*`), which
 * can take seconds on a failing title. The API leaves such a pattern out too; this guards an older answer.
 */
export const safePattern = (pattern: string): boolean => !/\([^()]*[+*}][^()]*\)[+*{]/.test(pattern);

/** Only `https:` links from the repo's data. */
export const httpsOnly = (url: string | null | undefined): string | null =>
  url && /^https:\/\//i.test(url) ? url : null;

/** Why `title` fails `rule`, in words; null when it passes or there is no rule. */
export function titleProblemOf(title: string, rule: ContributeTitleRule | null | undefined): string | null {
  if (!rule) return null;
  const trimmed = title.trim();
  if (rule.pattern) {
    if (!safePattern(rule.pattern)) return null;
    let match: RegExpMatchArray | null = null;
    try {
      match = trimmed.match(new RegExp(rule.pattern));
    } catch {
      return null;
    }
    if (!match) return `Follow the repo's title pattern \`${rule.pattern}\`.`;
    return partsProblemOf(match[1] ?? '', match[2], rule);
  }
  const match = trimmed.match(CONVENTIONAL);
  if (!match) {
    const type = !rule.types || rule.types.includes('fix') ? 'fix' : rule.types[0];
    return `Use the repo's \`type(scope): summary\` form, for example \`${type}${rule.requireScope ? '(scope)' : ''}: short summary\`.`;
  }
  return partsProblemOf(match[1], match[2], rule);
}

/** A title that fails a hard rule: the one thing that blocks Submit. */
export const titleBlocks = (title: string, rule: ContributeTitleRule | null | undefined): boolean =>
  Boolean(rule?.hard && titleProblemOf(title, rule));

export type ChecklistItem = {
  key: 'title' | 'cla' | 'changelog' | 'template' | 'generated';
  /** ok: met; blocked: Submit waits on it; todo: the user's to do, nothing blocks; info: told, nothing to do. */
  state: 'ok' | 'blocked' | 'todo' | 'info';
  label: string;
  detail: string | null;
  link: string | null;
};

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

/**
 * "This repo needs", before Submit: the title rule as typed, the CLA to sign, the changelog line the change adds, the
 * template's asks of AI-written PRs, the generated files the repo commits. Empty when the repo asks nothing we read.
 */
export function checklistOf(
  conventions: ContributeRepoConventions | null | undefined,
  input: { title: string; patch: string | null | undefined },
): ChecklistItem[] {
  if (!conventions) return [];
  const items: ChecklistItem[] = [];
  const rule = conventions.title;
  if (rule) {
    const problem = titleProblemOf(input.title, rule);
    const form = rule.pattern ? `the repo's own form` : `\`type(scope): summary\``;
    items.push({
      key: 'title',
      state: problem ? (rule.hard ? 'blocked' : 'todo') : 'ok',
      label: rule.hard ? `A title in ${form}, checked by ${rule.source}` : `A title in ${form}, as ${rule.source} asks`,
      detail: problem ?? (conventions.titleExamples[0] ? `Like: ${conventions.titleExamples[0]}` : null),
      link: null,
    });
  }
  if (conventions.cla) {
    items.push({
      key: 'cla',
      state: 'todo',
      label: httpsOnly(conventions.cla.signUrl)
        ? "A signed CLA: sign it after the PR opens; we can't sign for you"
        : "A signed CLA: the check on the PR links it after it opens; we can't sign for you",
      detail: `The \`${conventions.cla.check}\` check waits for it.`,
      link: httpsOnly(conventions.cla.signUrl),
    });
  }
  if (conventions.changelog) {
    const entry = entryLineOf(changelogLinesOf(input.patch, conventions.changelog.path));
    const what =
      conventions.changelog.kind === 'CHANGESETS'
        ? 'A changeset'
        : conventions.changelog.kind === 'FRAGMENTS'
          ? `A news fragment in ${conventions.changelog.path}`
          : `A line in ${conventions.changelog.path}`;
    items.push({
      key: 'changelog',
      state: entry ? 'ok' : conventions.changelog.required ? 'todo' : 'info',
      label: `${what}${conventions.changelog.required ? '' : ', as most PRs add'}`,
      detail: entry ? fillPlaceholders(entry) : 'This change adds none: edit the diff, or send it back to the agent.',
      link: null,
    });
  }
  if (conventions.template?.aiAsks.length) {
    items.push({
      key: 'template',
      state: 'info',
      label: 'The template asks AI-written PRs to say so',
      detail: conventions.template.aiAsks[0],
      link: null,
    });
  }
  if (conventions.generated.length) {
    items.push({
      key: 'generated',
      state: 'info',
      label: 'Generated files the repo commits',
      detail: conventions.generated.join(', '),
      link: null,
    });
  }
  return items;
}
