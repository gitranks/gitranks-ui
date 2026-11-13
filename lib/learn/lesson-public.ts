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
 * What a stub says, by why the lesson is closed: removed by its author, hidden by GitRanks, or (the lesson page alone)
 * held while reports on its questions are read. A public lesson never answers a stub; it reads as not available.
 */
export function stubTextOf(visibility: LessonVisibility): { title: string; text: string } {
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
        text: 'It cannot be opened. Any pull request it belonged to is still on GitHub.',
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

/** A step state as the JSON form writes it: lower case, as stored. */
const jsonStateOf = (state: LessonStepResult['state']) => state.toLowerCase();

/**
 * The facts of a result page as JSON (`/learn/lessons/<slug>/passes/<login>.json`): who passed which lesson, at which
 * version and when, and how each step went. Never an option the person picked. `origin` makes the addresses absolute.
 */
export function resultFactsOf(page: LessonResultPage, origin: string) {
  return {
    login: page.login,
    loginAtPass: page.loginAtPass,
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
