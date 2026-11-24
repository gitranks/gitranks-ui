import type { Screen } from '../registry';
import { AnswersPrivate, AnswersScreen } from '@/components/learn/walkthrough/answers-view';
import { FixerWaiting } from '@/components/learn/walkthrough/fixer-waiting';
import { FixerWalkthroughPlayer, WalkthroughFinished } from '@/components/learn/walkthrough/fixer-walkthrough';
import { WalkthroughNotHere } from '@/components/learn/walkthrough/walkthrough-not-here';
import {
  AboutThisFix,
  FixRemovedView,
  factsOf,
  WALKTHROUGH_MAIN,
  WalkthroughHead,
  WalkthroughPartArticle,
  walkthroughCrumbsOf,
} from '@/components/learn/walkthrough/walkthrough-parts';
import { PublicWalkthroughPlayer, type WalkthroughDrawn } from '@/components/learn/walkthrough/walkthrough-player';
import {
  answersKeptPrivate,
  fixerMine,
  fixerRun,
  fixerRunAskAgain,
  fixerSteps,
  octocatAnswers,
  octocatAnswersPrivate,
  readerMine,
  WALKTHROUGH_PR,
  walkthrough,
  walkthroughAnswerLastRight,
  walkthroughAnswerWrong,
  walkthroughNoLesson,
  walkthroughQuestions,
} from '@/lib/learn/__fixtures__/walkthrough';
import type { LessonRun } from '@/lib/learn/learn.types';
import { LEARN_ISSUES_PATH, learnFixWalkthroughPath } from '@/lib/learn/paths';
import type { Walkthrough } from '@/lib/learn/walkthrough';
import { pullRequestPath } from '@/lib/workspace/paths';

/**
 * A fix's walkthrough in the player (step 15): the public walkthrough (a question, a wrong pick, the last one right,
 * with and without a lesson, a phone), the fixer's own run before the pull request opens, a person's answers (shared,
 * the fixer's own, a reader who has not answered, kept private), and the pages with nothing to answer. From fixtures.
 * Held back from the export (`exported: false`): the export is at its file limit.
 */

const SOURCES = [
  'components/learn/walkthrough/walkthrough-player.tsx',
  'components/learn/walkthrough/fixer-walkthrough.tsx',
  'components/learn/walkthrough/answers-view.tsx',
  'components/learn/walkthrough/walkthrough-parts.tsx',
  'lib/learn/walkthrough.ts',
];

const PATH = learnFixWalkthroughPath(WALKTHROUGH_PR);
const ANSWERS_PATH = `${PATH}/by/octocat`;
const FIXER_PATH = `${pullRequestPath({ repo: 'acme/widgets', issue: 42 })}/walkthrough`;
const PR_PAGE = pullRequestPath({ repo: 'acme/widgets', issue: 42 });

const articlesOf = (shown: Walkthrough) =>
  shown.parts.map((part, index) => (
    <WalkthroughPartArticle
      key={part.id}
      heading={part.heading}
      blocks={part.blocks}
      index={index}
      count={shown.parts.length}
    />
  ));

/** The public walkthrough, drawn part-way. */
const Public = ({ shown = walkthrough, drawn }: { shown?: Walkthrough; drawn?: WalkthroughDrawn }) => (
  <PublicWalkthroughPlayer
    pr={WALKTHROUGH_PR}
    version={shown.version}
    crumbs={walkthroughCrumbsOf(shown)}
    head={<WalkthroughHead facts={factsOf(shown)} />}
    articles={articlesOf(shown)}
    questions={walkthroughQuestions}
    about={<AboutThisFix walkthrough={shown} />}
    next={LEARN_ISSUES_PATH}
    drawn={drawn}
    hints
  />
);

const fixerCrumbs = [
  { label: 'Pull requests', href: '/my/pull-requests' as never },
  { label: 'acme/widgets #42', href: PR_PAGE },
  { label: 'The walkthrough of this fix' },
];

/** The fixer's own run, before the pull request opens. */
const Fixer = ({ run }: { run: LessonRun }) => (
  <FixerWalkthroughPlayer
    attemptId="A_1"
    crumbs={fixerCrumbs}
    head={<WalkthroughHead facts={{ ...factsOf(walkthrough), number: null, fixer: null }} />}
    stepIds={fixerSteps.map((step) => step.id)}
    articles={articlesOf(walkthrough)}
    run={run}
    finish={PR_PAGE}
    hints
  />
);

export const LEARN_WALKTHROUGH_SCREENS: Screen[] = [
  {
    id: 'learn-walkthrough',
    title: 'A fix walkthrough',
    area: 'learn',
    route: '/learn/fixes/[owner]/[repo]/[number]/walkthrough',
    exported: false,
    sources: SOURCES,
    states: [
      {
        id: 'public-open',
        title: 'The public walkthrough: the first part and its question, before a pick',
        path: PATH,
        signedOut: true,
        height: 1100,
        render: () => <Public />,
      },
      {
        id: 'public-wrong',
        title: 'A wrong pick: crossed out, why it is wrong, and the person picks again',
        path: PATH,
        signedOut: true,
        height: 1100,
        render: () => <Public drawn={{ at: 0, answer: walkthroughAnswerWrong }} />,
      },
      {
        id: 'public-last-right',
        title: 'The last question right: "Finish the walkthrough"',
        path: PATH,
        height: 1100,
        render: () => <Public drawn={{ at: 3, answered: 4, answer: walkthroughAnswerLastRight }} />,
      },
      {
        id: 'public-no-lesson',
        title: 'A fix that used no lesson: the strip leads to Issues',
        path: PATH,
        signedOut: true,
        height: 1100,
        render: () => <Public shown={walkthroughNoLesson} />,
      },
      {
        id: 'public-phone',
        title: 'On a phone: the part, then its question',
        path: PATH,
        signedOut: true,
        width: 390,
        height: 1900,
        render: () => <Public drawn={{ at: 1, answered: 1 }} />,
      },
      {
        id: 'fixer-question',
        title: "The fixer's own run: the second part, only they can see it",
        path: FIXER_PATH,
        height: 1100,
        render: () => <Fixer run={fixerRun} />,
      },
      {
        id: 'fixer-ask-again',
        title: "A version 2 run's other question after a wrong pick, with the reason",
        path: FIXER_PATH,
        height: 1100,
        render: () => <Fixer run={fixerRunAskAgain} />,
      },
      {
        id: 'fixer-finished',
        title: 'Every question answered: on to approving the pull request',
        path: FIXER_PATH,
        height: 500,
        render: () => (
          <main className={WALKTHROUGH_MAIN}>
            <div className="max-w-md">
              <WalkthroughFinished count={4} finish={PR_PAGE} />
            </div>
          </main>
        ),
      },
      {
        id: 'fixer-writing',
        title: 'While the agent writes the walkthrough',
        path: FIXER_PATH,
        height: 500,
        render: () => <FixerWaiting rewriting={false} back={PR_PAGE} />,
      },
      {
        id: 'fixer-rewriting',
        title: 'While the agent rewrites it',
        path: FIXER_PATH,
        height: 500,
        render: () => <FixerWaiting rewriting back={PR_PAGE} />,
      },
      {
        id: 'answers-shared',
        title: "octocat's answers, as everyone reads them",
        path: ANSWERS_PATH,
        signedOut: true,
        height: 2600,
        render: () => (
          <AnswersScreen
            pr={WALKTHROUGH_PR}
            answers={octocatAnswers}
            walkthrough={walkthrough}
            own={false}
            mine={null}
          />
        ),
      },
      {
        id: 'answers-reader',
        title: 'A signed-in reader who has not answered: try the questions first',
        path: ANSWERS_PATH,
        height: 2700,
        render: () => (
          <AnswersScreen
            pr={WALKTHROUGH_PR}
            answers={octocatAnswers}
            walkthrough={walkthrough}
            own={false}
            mine={readerMine}
          />
        ),
      },
      {
        id: 'answers-own-shared',
        title: 'The fixer\'s own answers, shared, with "Stop sharing"',
        path: ANSWERS_PATH,
        viewer: { login: 'octocat' },
        height: 2600,
        render: () => (
          <AnswersScreen
            pr={WALKTHROUGH_PR}
            answers={octocatAnswers}
            walkthrough={walkthrough}
            own
            mine={fixerMine}
            onShared={() => {}}
          />
        ),
      },
      {
        id: 'answers-own-private',
        title: 'The fixer\'s own answers, kept private, with "Share them again"',
        path: ANSWERS_PATH,
        viewer: { login: 'octocat' },
        height: 2600,
        render: () => (
          <AnswersScreen
            pr={WALKTHROUGH_PR}
            answers={octocatAnswersPrivate}
            walkthrough={walkthrough}
            own
            mine={fixerMine}
            onShared={() => {}}
          />
        ),
      },
      {
        id: 'answers-kept-private',
        title: 'Answers the fixer keeps private, as everyone else reads them',
        path: ANSWERS_PATH,
        signedOut: true,
        height: 600,
        render: () => <AnswersPrivate pr={WALKTHROUGH_PR} login={answersKeptPrivate.login} />,
      },
      {
        id: 'not-here',
        title: 'A walkthrough the read does not bring: not open right now',
        path: PATH,
        signedOut: true,
        height: 500,
        render: () => <WalkthroughNotHere pr={WALKTHROUGH_PR} />,
      },
      {
        id: 'removed',
        title: 'A fix whose pages were removed',
        path: '/learn/fixes/_removed/acme/widgets/57',
        signedOut: true,
        height: 500,
        render: () => <FixRemovedView repo="acme/widgets" number={57} />,
      },
    ],
  },
];
