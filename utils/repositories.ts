export type RepositorySource = {
  name: string;
  url?: string | null;
};

export const getRepoUrl = (source: RepositorySource, login: string) => {
  if (source.url) {
    return `${source.url}/pulls?q=is%3Apr+author%3A${login}+is%3Aclosed`;
  }

  return `https://github.com/${login}/${source.name}`;
};

export const getRepoName = (source: RepositorySource) => {
  if (source.url) {
    return source.url.replace('https://github.com/', '');
  }

  return source.name;
};

type ContributionPrsQuery = {
  url: string;
  login: string;
  year: number;
  /** Whether the count the link stands for is merged PRs only, or every PR of the year. */
  mergedOnly: boolean;
};

/**
 * The PRs behind one row of the contributions timeline: the same year and the same state as the count it shows.
 * The year is the PR's creation date in UTC, which is how GitHub's `contributionsCollection` buckets them.
 */
export const getContributionPrsUrl = ({ url, login, year, mergedOnly }: ContributionPrsQuery) => {
  const query = [
    'is:pr',
    mergedOnly && 'is:merged',
    `author:${login}`,
    `created:${year}-01-01T00:00:00Z..${year}-12-31T23:59:59Z`,
  ]
    .filter(Boolean)
    .join(' ');

  return `${url}/pulls?${new URLSearchParams({ q: query })}`;
};
