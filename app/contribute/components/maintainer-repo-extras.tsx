import { MaintainerRepoSettings } from './maintainer-repo-settings';
import type { ContributeConfigKey, ContributeMaintainerRepo } from '@/lib/contribute/contribute.types';

/**
 * Whether "Your repos" offers a repository's rules, so the page may point there ("Set the same rules after signing
 * in"). True since `MaintainerRepoExtras` draws them.
 */
export const MAINTAINER_SETTINGS_SHOWN = true;

/**
 * A repository's further settings on "Your repos", under its blocked contributors and stopped PRs: what we read from
 * it, and the keys the page sets. Nothing from an API without them.
 */
export function MaintainerRepoExtras({ repo, keys }: { repo: ContributeMaintainerRepo; keys: ContributeConfigKey[] }) {
  if (!repo.config) return null;
  return <MaintainerRepoSettings repo={repo} keys={keys} />;
}
