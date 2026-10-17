/** How many removed repos one timeline entry names; the rest are summed up in an "and N more" note. */
export const REMOVED_REPOS_SHOWN = 10;

type RemovedRepo = { name: string; stargazers?: number | null };

type RemovedReposChangeset = { b?: unknown; count?: number | null; stars?: number | null };

const starsOf = (repo: RemovedRepo) => repo.stargazers ?? 0;
const formatCount = (value: number) => value.toLocaleString('en-US');

/**
 * The text of a "Repo Removed" timeline entry: the most-starred repos by name, then how many more there were and
 * how many stars those had.
 *
 * An account that hides every repo at once produces one entry listing all of them, thousands of names on one line,
 * so at most `shown` are named. An entry can carry `count` and `stars` totals over every removed repo, with `b`
 * holding only the top ones; without them `b` is the whole list and the totals are counted from it.
 */
export function describeRemovedRepos(changeset: RemovedReposChangeset, shown = REMOVED_REPOS_SHOWN): string | null {
  if (!Array.isArray(changeset.b) || !changeset.b.length) {
    return null;
  }

  const repos: RemovedRepo[] = changeset.b;
  const named = repos.toSorted((left, right) => starsOf(right) - starsOf(left)).slice(0, shown);
  const total = typeof changeset.count === 'number' ? changeset.count : repos.length;
  const totalStars =
    typeof changeset.stars === 'number' ? changeset.stars : repos.reduce((sum, repo) => sum + starsOf(repo), 0);
  const moreCount = total - named.length;
  const moreStars = totalStars - named.reduce((sum, repo) => sum + starsOf(repo), 0);

  const text = named.map((repo) => `${repo.name} ★${formatCount(starsOf(repo))}`).join('; ');

  if (moreCount <= 0) {
    return text;
  }

  const more = `and ${formatCount(moreCount)} more`;

  return `${text}; ${moreStars > 0 ? `${more} (★${formatCount(moreStars)})` : more}`;
}
