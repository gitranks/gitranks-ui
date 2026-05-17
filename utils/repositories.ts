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
