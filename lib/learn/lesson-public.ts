import type {
  LessonHead,
  LessonPage,
  LessonQuestionKeyed,
  LessonReaction,
  LessonResultPage,
  LessonResultReaction,
  LessonStepResult,
  LessonStub,
  LessonVisibility,
} from './learn.types';
import { lessonPath, lessonResultPath } from './learn-path';
import { isStepDone, partsLabelOf } from './question';
import type { PrFeedbackErrorCode } from '@/lib/contribute/errors';

/** A public read as the pages use it: the lesson (or result), a stub naming why it is closed, or nothing (a 404). */
export type PublicAnswer<T> = { kind: 'found'; value: T } | { kind: 'stub'; visibility: LessonVisibility } | null;

/** The API's union, told apart by its type name; anything unexpected is nothing. */
export function publicAnswerOf<T extends { __typename: string }>(
  answer: T | LessonStub | null | undefined,
  typename: T['__typename'],
): PublicAnswer<T> {
  if (!answer) return null;
  if (answer.__typename === 'LessonStub') return { kind: 'stub', visibility: (answer as LessonStub).visibility };
  return answer.__typename === typename ? { kind: 'found', value: answer as T } : null;
}

export type LessonPageAnswer = PublicAnswer<LessonPage>;
export type LessonResultAnswer = PublicAnswer<LessonResultPage>;

/**
 * What a stub says, by why the lesson is closed: removed by its author, or (the lesson page alone) held while reports
 * on its questions are read. A hidden lesson reads as one that is not there (`MISSING`, the 404's words): it is not
 * available, and the address names nothing more.
 */
export function stubTextOf(visibility: LessonVisibility | 'MISSING'): { title: string; text: string } {
  switch (visibility) {
    case 'REMOVED':
      return {
        title: 'This lesson was removed by its author',
        text: 'Its author took it down, with the results on it. Any pull request it belonged to is still on GitHub.',
      };
    case 'HELD':
      return {
        title: 'This lesson is paused',
        text: 'We are reading reports on its questions. The results that pull requests link to stay up.',
      };
    default:
      return {
        title: 'This lesson is not available',
        text: 'The address may be wrong, or the lesson was hidden. Any pull request it belonged to is still on GitHub.',
      };
  }
}

/** "14 people passed it": from 2 up, as one pass is the author's own. */
export const passesShown = (passes: number) => passes >= 2;

/** "Claude Code (Opus)": the agent that wrote the fix and the lesson. */
export const agentNameOf = (head: Pick<LessonHead, 'author'>) =>
  head.author.agentFamily ? `${head.author.agentName} (${head.author.agentFamily})` : head.author.agentName;

/** The pull request the lesson belongs to, with its address; null when it has none. */
export function pullRequestOf(head: Pick<LessonHead, 'subject'>): { number: number; url: string } | null {
  const { repo, pr, prUrl } = head.subject;
  if (!pr) return null;
  return { number: pr, url: prUrl ?? (repo ? `https://github.com/${repo}/pull/${pr}` : '') };
}

/** One step of a result: what it covers, its title, and how the run went on it. */
export type ResultRow = { stepId: string; index: number; parts: string; title: string; result: LessonStepResult };

/** The figures of a result: steps passed, known before, passed first try, and passed after more tries. */
export type ResultFigures = {
  passed: number;
  total: number;
  knew: number;
  firstTry: number;
  moreTries: number;
  /** The tries every step passed after more tries needed, when they all needed the same; else null. */
  sameTries: number | null;
  reported: number;
};

export function resultFiguresOf(page: Pick<LessonResultPage, 'steps' | 'results'>): ResultFigures {
  const byStep = new Map(page.results.map((result) => [result.stepId, result]));
  const results = page.steps.map((step) => byStep.get(step.id));
  const count = (state: LessonStepResult['state']) => results.filter((result) => result?.state === state).length;
  const tries = [...new Set(results.filter((result) => result?.state === 'TRY_N').map((result) => result!.tries))];
  return {
    passed: results.filter((result) => isStepDone(result)).length,
    total: page.steps.length,
    knew: count('KNEW'),
    firstTry: count('FIRST_TRY'),
    moreTries: count('TRY_N'),
    sameTries: tries.length === 1 ? tries[0] : null,
    reported: count('REPORTED'),
  };
}

/** The result's steps in the lesson's order, each with its result (open when the run has none for it). */
export function resultRowsOf(page: Pick<LessonResultPage, 'steps' | 'results'>): ResultRow[] {
  const byStep = new Map(page.results.map((result) => [result.stepId, result]));
  return page.steps.map((step, index) => ({
    stepId: step.id,
    index,
    parts: partsLabelOf(step),
    title: step.title,
    result: byStep.get(step.id) ?? { stepId: step.id, state: 'OPEN', tries: 0 },
  }));
}

/** The questions a run was asked, by step, in the order asked. */
export function askedByStepOf(asked: readonly LessonQuestionKeyed[]): Map<string, LessonQuestionKeyed[]> {
  const byStep = new Map<string, LessonQuestionKeyed[]>();
  for (const question of asked) {
    byStep.set(question.stepId, [...(byStep.get(question.stepId) ?? []), question]);
  }
  return byStep;
}

/** Whether the login is the lesson's author, whose result the pull request links to. */
export const isAuthorOf = (head: Pick<LessonHead, 'author'>, login: string) =>
  !!head.author.login && head.author.login.toLowerCase() === login.toLowerCase();

/** "said it helped" / "said it did not help". */
export const reactionWordsOf = (reaction: LessonReaction) =>
  reaction === 'YES' ? 'said it helped' : 'said it did not help';

/** "maintainer of driftwood-js/driftwood"; the role alone without a repository. */
export const reactionRoleOf = (reaction: Pick<LessonResultReaction, 'role'>, repo: string | null) =>
  repo ? `${reaction.role} of ${repo}` : reaction.role;

/**
 * The line a result page's own person sees in place of the reaction buttons, since their own result takes no reaction:
 * the lesson's author, whose pull request it is, or another taker of a shared lesson.
 */
export const ownResultLineOf = (author: boolean) =>
  author
    ? 'This is your pull request: only its reviewers answer here.'
    : 'This is your own result: other people answer here.';

/**
 * Whether the signed-in login is the result's own person, who cannot react to it. Best-effort, by login: a session
 * from before a rename is not recognised (its click is refused with `OWN_PR`, which then shows the same line).
 */
export const isOwnResult = (viewer: string | null | undefined, resultLogin: string) =>
  !!viewer && viewer.toLowerCase() === resultLogin.toLowerCase();

const REACTION_ERRORS: Record<PrFeedbackErrorCode, string> = {
  SIGNED_OUT: 'GitHub did not accept your sign-in. Sign in again, then send your answer.',
  NOT_OURS: 'This result is no longer open to answers.',
  OWN_PR: ownResultLineOf(true),
  RATE_LIMITED: 'You have sent the most answers we take in a day. Try again tomorrow.',
  FORBIDDEN: 'This GitHub account cannot answer here.',
  GITHUB_UNAVAILABLE: 'GitHub did not answer. Try again in a minute.',
  INVALID: 'This answer was not accepted. Reload the page and pick again.',
  NOT_AVAILABLE_YET: 'This is not available yet. It is coming soon.',
  FAILED: 'Something went wrong. Try again in a minute.',
};

/** The words for a reaction the API refused, by its code. */
export const reactionErrorMessage = (error: PrFeedbackErrorCode): string =>
  REACTION_ERRORS[error] ?? REACTION_ERRORS.FAILED;

/**
 * What the reactions card does with an answer: show the stored reactions, ask for the sign-in again, show the own
 * person's line, say nothing (a pick back from a sign-in this browser did not start), or say why it failed.
 */
export type ReactionOutcome =
  | { kind: 'stored'; reactions: LessonResultReaction[] }
  | { kind: 'prompt' }
  | { kind: 'own' }
  | { kind: 'silent' }
  | { kind: 'error'; message: string };

export function reactionOutcomeOf(
  answer: { ok: true; data: LessonResultReaction[] } | { ok: false; error: PrFeedbackErrorCode },
  returning: boolean,
): ReactionOutcome {
  if (answer.ok) return { kind: 'stored', reactions: answer.data };
  if (answer.error === 'SIGNED_OUT') return { kind: 'prompt' };
  if (answer.error === 'OWN_PR') return { kind: 'own' };
  if (returning && answer.error === 'INVALID') return { kind: 'silent' };
  return { kind: 'error', message: reactionErrorMessage(answer.error) };
}

/** A step state as the JSON form writes it: lower case, as stored. */
const jsonStateOf = (state: LessonStepResult['state']) => state.toLowerCase();

/**
 * The facts of a result page as JSON (`/learn/lessons/<slug>/passes/<login>.json`): who passed which lesson, at which
 * version and when, and how each step went. Never an option the person picked. `origin` makes the addresses absolute.
 */
export function resultFactsOf(page: LessonResultPage, origin: string) {
  return {
    login: page.login,
    githubId: page.githubId,
    lesson: {
      slug: page.head.slug,
      title: page.head.title,
      kind: page.head.kind,
      url: new URL(lessonPath(page.head.slug), origin).toString(),
    },
    version: page.version,
    passedAt: page.passedAt,
    minutes: page.minutes,
    steps: resultRowsOf(page).map((row) => ({
      id: row.stepId,
      title: row.title,
      state: jsonStateOf(row.result.state),
      tries: row.result.tries,
    })),
    url: new URL(lessonResultPath(page.head.slug, page.login), origin).toString(),
  };
}

export type ResultFacts = ReturnType<typeof resultFactsOf>;
