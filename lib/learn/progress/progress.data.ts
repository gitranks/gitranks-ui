import 'server-only';

import { cache } from 'react';

import type { ProgressList, ProgressView } from './progress';
import {
  LearnProgressDocument,
  LearnProgressLessonsDocument,
  LearnProgressMergedDocument,
  LearnProgressReposDocument,
} from './progress.documents';
import type { LearnProgress } from './progress.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { contributeErrorOf } from '@/lib/workspace/errors';

/**
 * One of the viewer's Learn reads: null when the API has nothing for them (signed out, or Learn not open to them),
 * undefined when it does not answer, which the page says.
 */
async function progressRead<T>(read: (githubLogin: string) => Promise<T>): Promise<T | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    return await read(githubLogin);
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    return error === 'NOT_FOUND' || error === 'SIGNED_OUT' ? null : undefined;
  }
}

/** The viewer's Learn numbers. Read once per request. */
export const loadLearnProgress = cache(
  (): Promise<LearnProgress | null | undefined> =>
    progressRead(async (githubLogin) => {
      const { learnProgress } = await graphqlDirect(LearnProgressDocument, undefined, { source: 'ssr', githubLogin });
      return learnProgress;
    }),
);

/** A page of `view`'s list. A page past the end is answered with the last one. Read once per request. */
export const loadProgressList = cache(
  (view: ProgressView, page: number): Promise<ProgressList | null | undefined> =>
    progressRead(async (githubLogin): Promise<ProgressList> => {
      const options = { source: 'ssr', githubLogin } as const;
      switch (view) {
        case 'merged': {
          const { learnProgressMerged } = await graphqlDirect(LearnProgressMergedDocument, { page }, options);
          return { view, merged: learnProgressMerged };
        }
        case 'repos': {
          const { learnProgressRepos } = await graphqlDirect(LearnProgressReposDocument, { page }, options);
          return { view, repos: learnProgressRepos };
        }
        default: {
          const { learnProgressLessons } = await graphqlDirect(
            LearnProgressLessonsDocument,
            { view: view === 'learned' ? 'LEARNED' : 'PASSED', page },
            options,
          );
          return { view, lessons: learnProgressLessons };
        }
      }
    }),
);
