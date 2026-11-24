import { parse } from 'graphql';

import { ISSUES_LESSON_FIELDS } from './issues.documents';
import type DocumentNode from '@/types/typed-document-node';

/*
 * A fix's walkthrough: the public walkthrough with its key, a person's answers, the fixer's own answers, the person's
 * side of a fix, where a fix's address leads, and the two calls (a pass, the sharing switch). Each is its own
 * operation, apart from every page's other reads: an API that does not know one yet fails that read alone.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** The pull request, as the API's `LearnFixRef` takes it. */
export type FixRefInput = { owner: string; repo: string; number: number };

const WALKTHROUGH = `repo issueNumber number title language fixer version ${ISSUES_LESSON_FIELDS}
  parts { id heading blocks question { id multi prompt options { id text right why } } }`;
const ANSWERS = `login passedAt shared readers walkthrough { ${WALKTHROUGH} } answers { question tries }`;

/** A fix's walkthrough with its key, the same for everyone; null when its page is not up. */
export const LearnWalkthroughDocument = doc<{ learnWalkthrough: unknown }, { ref: FixRefInput }>(
  `query LearnWalkthrough($ref: LearnFixRef!) { learnWalkthrough(ref: $ref) { ${WALKTHROUGH} } }`,
);

/** A person's answers, the same for everyone; only `shared: false` while the fixer keeps theirs private. */
export const LearnWalkthroughAnswersDocument = doc<
  { learnWalkthroughAnswers: unknown },
  { ref: FixRefInput; login: string }
>(
  `query LearnWalkthroughAnswers($ref: LearnFixRef!, $login: String!) {
  learnWalkthroughAnswers(ref: $ref, login: $login) { ${ANSWERS} }
}`,
);

/** The fixer's own answers, shared or not; null for anyone else. */
export const LearnMyWalkthroughAnswersDocument = doc<{ learnMyWalkthroughAnswers: unknown }, { ref: FixRefInput }>(
  `query LearnMyWalkthroughAnswers($ref: LearnFixRef!) { learnMyWalkthroughAnswers(ref: $ref) { ${ANSWERS} } }`,
);

/** The person's side of a fix: whether they made it, its walkthrough held, their pass, the first similar issue. */
export const LearnFixMineDocument = doc<{ learnFixMine: unknown }, { ref: FixRefInput }>(
  `query LearnFixMine($ref: LearnFixRef!) {
  learnFixMine(ref: $ref) { fixer walkthroughHeld passedAt similar { issue { issue { id } } } }
}`,
);

/** Where a fix's address leads, by its pull request (with a login for an answers page). */
export const LearnFixAddressDocument = doc<{ learnFixAddress: unknown }, { ref: FixRefInput; login: string | null }>(
  `query LearnFixAddress($ref: LearnFixRef!, $login: String) {
  learnFixAddress(ref: $ref, login: $login) { state owner repo number login }
}`,
);

/**
 * Where a walkthrough's old address now is, by its slug: with a login, that person's answers on the fix's page (an old
 * result page); without, the fix's page.
 */
export const LearnFixAddressBySlugDocument = doc<{ learnFixAddress: unknown }, { slug: string; login: string | null }>(
  `query LearnFixAddressBySlug($slug: String!, $login: String) {
  learnFixAddress(slug: $slug, login: $login) { state owner repo number login }
}`,
);

/** Where the fixer's answers are, by the attempt that made the fix. */
export const LearnFixAddressByAttemptDocument = doc<{ learnFixAddress: unknown }, { attempt: string }>(
  `query LearnFixAddressByAttempt($attempt: ID!) {
  learnFixAddress(attempt: $attempt) { state owner repo number login }
}`,
);

/** A signed-in person finished another person's walkthrough: once per version; false for the fixer. */
export const PassLearnWalkthroughDocument = doc<
  { passLearnWalkthrough: boolean | null },
  { ref: FixRefInput; version: number }
>(
  `mutation PassLearnWalkthrough($ref: LearnFixRef!, $version: Int!) {
  passLearnWalkthrough(ref: $ref, version: $version)
}`,
);

/** The fixer shares their answers or keeps them private, and gets them back. */
export const ShareLearnWalkthroughAnswersDocument = doc<
  { shareLearnWalkthroughAnswers: unknown },
  { ref: FixRefInput; shared: boolean }
>(
  `mutation ShareLearnWalkthroughAnswers($ref: LearnFixRef!, $shared: Boolean!) {
  shareLearnWalkthroughAnswers(ref: $ref, shared: $shared) { ${ANSWERS} }
}`,
);
