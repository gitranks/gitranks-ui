import { cacheLife, cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageRepoDocument, type PageRepoQuery } from '@/types/generated/graphql';
import { getRepoCacheTag } from '@/utils/repo-paths';

/** The API's error code for a repository name it could not look up just now (not an answer that it is missing). */
export const LOOKUP_UNAVAILABLE_CODE = 'REPO_LOOKUP_UNAVAILABLE';

/** Whether a failed read is that error: the request helper throws the API's errors as their JSON. */
export const isLookupUnavailable = (error: unknown) =>
  error instanceof Error && error.message.includes(`"code":"${LOOKUP_UNAVAILABLE_CODE}"`);

export const fetchRepo = async (owner: string, name: string) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));

  let repo: PageRepoQuery['repo'] | undefined;
  try {
    ({ repo } = (await graphqlDirect(PageRepoDocument, { owner, name })) ?? {});
  } catch (error) {
    // The API could not look an unknown name up just now: the repository may exist, so the miss is kept briefly.
    if (!isLookupUnavailable(error)) throw error;
    cacheLife('minutes');
    return null;
  }
  // A running fetch ends on its own, so a result that shows one is kept only briefly.
  if (repo?.pull?.status === 'running') {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }

  return repo ?? null;
};
