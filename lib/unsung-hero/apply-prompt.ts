import type { ApplyRegistry } from './apply.types';
import { REGISTRIES, registryRowOfApi } from '@/lib/packages/registries';

/** One rule of the slot, as the apply page and the agent's prompt both state it. */
export type ApplyRule = { title: string; text: string };

/**
 * What we look for, in plain words: no numbers that move (each registry's download line is its own). The page lists
 * them and the prompt is built from them, through `applyRulesOf`, so the two never drift.
 */
export const APPLY_RULES: readonly ApplyRule[] = [
  { title: 'Heavily used', text: 'Among the most downloaded packages in its registry.' },
  { title: 'Few stars for its reach', text: 'Its GitHub repository has under 1,000 stars.' },
  { title: 'Maintained', text: 'A push to the repository in the last 12 months.' },
  { title: 'Safe to use', text: 'No open security advisory for the package in GitHub’s advisory database.' },
  { title: 'Open source', text: 'An OSI-approved license.' },
  { title: 'Linked both ways', text: 'The package names the GitHub repository as its source, and GitHub confirms it.' },
];

/**
 * Whether a registry, as the API names it, publishes no download counts, by the site's registry table (every row, the
 * site showing its packages yet or not: the API names the registries heroes come from): its packages are read by the
 * projects that depend on them. One the table has no row for is not said to have none, and neither is one whose first
 * count is not read yet (pub.dev): it publishes counts, so its row's own trait is read here.
 */
const publishesNoDownloads = (id: string) => {
  const registry = registryRowOfApi(id);
  return registry !== null && REGISTRIES[registry].downloads === null;
};

/**
 * The rules for these registries: "Heavily used" says how a registry with no download counts is read, naming only
 * such registries as are listed.
 */
export function applyRulesOf(registries: readonly ApplyRegistry[]): ApplyRule[] {
  const uncounted = registries.filter(({ id }) => publishesNoDownloads(id));
  const [first, ...rest] = APPLY_RULES;
  if (!uncounted.length) return [first, ...rest];
  const publish = uncounted.length > 1 ? 'publish' : 'publishes';
  const text = `${first.text} For ${registryNamesOf(uncounted)}, which ${publish} no download counts: many well-known GitHub projects depend on it.`;
  return [{ ...first, text }, ...rest];
}

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
  const rules = applyRulesOf(registries)
    .map(({ title, text }, index) => `${index + 1}. ${title}: ${text}`)
    .join('\n');
  const listed = registryNamesOf(registries);
  const from = listed ? `\n\nThe package must be on one of these registries: ${listed}.` : '';
  return `Check whether ${what}${repository} fits the GitRanks Unsung hero slot (gitranks.com/unsung-heroes): one heavily used open-source package a week that few people star.

The rules:
${rules}${from}

For each rule, tell me whether it holds and how you checked, using public data (the registry, GitHub, the GitHub Advisory Database). For any that fails, suggest what could be done about it. Do not change anything without asking me first.`;
}
