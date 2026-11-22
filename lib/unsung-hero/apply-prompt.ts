import type { ApplyRegistry } from './apply.types';

/** One rule of the slot, as the apply page and the agent's prompt both state it. */
export type ApplyRule = { title: string; text: string };

/**
 * What we look for, in plain words: no numbers that move (each registry's download line is its own). The page lists
 * these and the prompt is built from them, so the two never drift.
 */
export const APPLY_RULES: readonly ApplyRule[] = [
  {
    title: 'Heavily used',
    text: 'Among the most downloaded packages in its registry. For Maven Central and Go, which publish no download counts: many well-known GitHub projects depend on it.',
  },
  { title: 'Few stars for its reach', text: 'Its GitHub repository has under 1,000 stars.' },
  { title: 'Maintained', text: 'A push to the repository in the last 12 months.' },
  { title: 'Safe to use', text: 'No open security advisory for the package in GitHub’s advisory database.' },
  { title: 'Open source', text: 'An OSI-approved license.' },
  { title: 'Linked both ways', text: 'The package names the GitHub repository as its source, and GitHub confirms it.' },
];

/** The registries as a list in words: "npm, PyPI and crates.io". */
export function registryNamesOf(registries: readonly ApplyRegistry[]): string {
  const labels = registries.map(({ label }) => label);
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}` : (labels[0] ?? '');
}

/** A registry as written, from the API's list; the API's own name for one the list does not hold. */
export const registryLabelOf = (registries: readonly ApplyRegistry[], id: string | null | undefined): string | null =>
  id ? (registries.find((registry) => registry.id === id)?.label ?? id) : null;

/**
 * What the prompt is about: a package we found (its registry, its name as the registry spells it, its repository), or
 * a nomination as typed, with neither registry nor repository.
 */
export type PromptPackage = {
  registry: string | null;
  name: string;
  displayName?: string | null;
  repository?: string | null;
};

/**
 * The prompt to paste into a coding agent: the package, the rules, and what to do: check each rule from public data,
 * suggest fixes, change nothing without asking.
 */
export function applyPromptOf(pkg: PromptPackage, registries: readonly ApplyRegistry[]): string {
  const registry = registryLabelOf(registries, pkg.registry);
  const name = pkg.displayName || pkg.name;
  const what = registry ? `the ${registry} package ${name}` : `the package ${name}`;
  const repository = pkg.repository ? ` (github.com/${pkg.repository})` : '';
  const rules = APPLY_RULES.map(({ title, text }, index) => `${index + 1}. ${title}: ${text}`).join('\n');
  const listed = registryNamesOf(registries);
  const from = listed ? `\n\nThe package must be on one of these registries: ${listed}.` : '';
  return `Check whether ${what}${repository} fits the GitRanks Unsung hero slot (gitranks.com/unsung-heroes): one heavily used open-source package a week that few people star.

The rules:
${rules}${from}

For each rule, tell me whether it holds and how you checked, using public data (the registry, GitHub, the GitHub Advisory Database). For any that fails, suggest what could be done about it. Do not change anything without asking me first.`;
}
