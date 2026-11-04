/**
 * Whether "Your repos" offers a repository's rules, so the page may point there ("Set the same rules after signing
 * in"). False until `MaintainerRepoExtras` draws them.
 */
export const MAINTAINER_SETTINGS_SHOWN = false;

/**
 * A repository's further settings on "Your repos", under its blocked contributors and stopped PRs. Nothing yet: the
 * place is kept so they land beside the lists.
 */
export function MaintainerRepoExtras(_: { repoId: string }) {
  return null;
}
