import 'server-only';

import { cache } from 'react';

import {
  LessonPageDocument,
  LessonResultDocument,
  MyLessonRunDocument,
  MyResultReactionDocument,
} from './learn.documents';
import type { LessonPage, LessonReaction, LessonResultPage, LessonRun } from './learn.types';
import { githubLoginOf, lessonSlugOf } from './learn-path';
import { type LessonPageAnswer, type LessonResultAnswer, publicAnswerOf } from './lesson-public';
import { ContributeUnavailableError, viewerLogin } from '@/lib/contribute/contribute.data';
import { contributeErrorOf, prFeedbackErrorOf } from '@/lib/contribute/errors';
import { currentMaintainerToken } from '@/lib/contribute/maintainer-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * A public read's failure: nothing to show (an unknown lesson, or an API that does not know the read yet) answers
 * null, a 404; anything else throws `ContributeUnavailableError`, the pages' "did not load".
 */
function missingOrThrow(failure: unknown): null {
  const { error } = contributeErrorOf(failure);
  if (error === 'NOT_FOUND' || error === 'NOT_AVAILABLE_YET' || error === 'INVALID') return null;
  throw new ContributeUnavailableError();
}

/**
 * A shared lesson as anyone reads it: never as the viewer (no login is sent), so every visitor gets the same answer.
 * Not cached here, so a take-down shows at once.
 */
export async function readLessonPage(slug: unknown): Promise<LessonPageAnswer> {
  const id = lessonSlugOf(slug);
  if (!id) return null;
  try {
    const { lessonPage } = await graphqlDirect(LessonPageDocument, { slug: id }, { source: 'ssr' });
    return publicAnswerOf<LessonPage>(lessonPage, 'LessonPage');
  } catch (failure) {
    return missingOrThrow(failure);
  }
}

/** One login's public passed run of a lesson, as anyone reads it; null when it has none (a 404). */
export async function readLessonResult(slug: unknown, login: unknown): Promise<LessonResultAnswer> {
  const id = lessonSlugOf(slug);
  const githubLogin = githubLoginOf(login);
  if (!id || !githubLogin) return null;
  try {
    const { lessonResult } = await graphqlDirect(
      LessonResultDocument,
      { slug: id, login: githubLogin },
      { source: 'ssr' },
    );
    return publicAnswerOf<LessonResultPage>(lessonResult, 'LessonResultPage');
  } catch (failure) {
    return missingOrThrow(failure);
  }
}

/** `readLessonPage`, once per request: the page and its metadata share it. */
export const loadLessonPage = cache(readLessonPage);

/** `readLessonResult`, once per request: the page and its metadata share it. */
export const loadLessonResult = cache(readLessonResult);

/**
 * The signed-in viewer's run of a shared lesson: their open one, else their latest passed one. Null signed out, without
 * a run, or on any failure: the page then offers to start one.
 */
export const loadMyLessonRun = cache(async (slug: string): Promise<LessonRun | null> => {
  const githubLogin = await viewerLogin();
  const id = lessonSlugOf(slug);
  if (!githubLogin || !id) return null;
  try {
    const { myLessonRun } = await graphqlDirect(MyLessonRunDocument, { slug: id }, { source: 'ssr', githubLogin });
    return myLessonRun;
  } catch {
    return null;
  }
});

/**
 * Whether the visitor has the light GitHub sign-in a reaction needs, and their stored reaction on this result page,
 * read with its token (a variable, never returned or logged). No token: `canReact` false.
 */
export const loadMyResultReaction = cache(
  async (slug: string, login: string): Promise<{ canReact: boolean; reaction: LessonReaction | null }> => {
    const token = await currentMaintainerToken();
    if (!token) return { canReact: false, reaction: null };
    try {
      const { myResultReaction } = await graphqlDirect(
        MyResultReactionDocument,
        { slug, login, token },
        { source: 'ssr' },
      );
      return { canReact: true, reaction: myResultReaction ?? null };
    } catch (failure) {
      // A token GitHub no longer accepts asks for the sign-in again.
      return { canReact: prFeedbackErrorOf(failure) !== 'SIGNED_OUT', reaction: null };
    }
  },
);
