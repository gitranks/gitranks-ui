import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { ExampleBlock } from '@/components/learn/blocks/example-block';
import { VisualBlock } from '@/components/learn/blocks/visual-block';
import { checkPlace, lessonPlace, reviewPlace } from '@/components/learn/player/places';
import { type PlayerCrumb, PlayerRunEnd, PlayerStrip } from '@/components/learn/player/player-strip';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { QuestionPart } from '@/components/learn/question/question-part';
import type { LearnAnswer } from '@/components/learn/question/use-learn-answer';
import { answerAfter, checkQuestion, pickLineQuestion } from '@/lib/learn/__fixtures__/learn-question';
import {
  compareVisual,
  diagramVisual,
  hasDuplicateCodes,
  nestedLoopCodes,
  reviewQuestion,
  reviewQuestionKeyed,
  tableVisual,
} from '@/lib/learn/__fixtures__/player';
import { canSendOf, type LearnAnswerAction } from '@/lib/learn/learn-answer';
import type { LearnQuestion } from '@/lib/learn/learn-question';
import { type PlayerRun, runWordsOf, squaresOf } from '@/lib/learn/player';

const noop = () => {};

/** An answer that stands still in a state, as the engine would have moved it there. */
function answerOf(question: LearnQuestion, actions: LearnAnswerAction[]): LearnAnswer {
  const state = answerAfter(question, actions);
  return {
    state,
    language: 'python',
    canSend: canSendOf(question, state),
    pick: noop,
    extra: noop,
    myth: noop,
    move: noop,
    step: noop,
    main: noop,
  };
}

const LEARN: PlayerCrumb = { label: 'Learn', href: '/learn' };
const COURSE: PlayerCrumb = { label: 'Algorithms' };

const reviewRun: PlayerRun = { at: 2, count: 6, results: ['right', 'wrong'] };
const checkRun: PlayerRun = { at: 3, count: 9, results: ['answered', 'answered', 'answered'] };
const endRun: PlayerRun = { at: 6, count: 6, results: ['right', 'wrong', 'right', 'right', 'wrong', 'right'] };

/** One strip with the words above it that say which place it is. */
function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <span className="px-4 text-sm font-semibold">{label}</span>
      <div className="border-t">{children}</div>
    </section>
  );
}

/** The review's and the check's column under the strip, as their boards draw it. */
function Column({ from, children }: { from: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16">
      <div className="mx-auto flex w-full flex-col gap-4" style={{ maxWidth: '38rem' }}>
        <div className="flex min-h-7 items-center text-sm text-muted-foreground">A lesson from {from}</div>
        {children}
      </div>
    </main>
  );
}

/** The player's parts the pages share: the strip of each place, the card with highlighted code, and the blocks. */
export const LEARN_PLAYER_SCREEN: Screen = {
  id: 'learn-player',
  title: 'The player: its strip, code and visuals',
  area: 'learn',
  route: '/learn/review',
  sources: [
    'components/learn/player/player-strip.tsx',
    'components/learn/player/places.ts',
    'components/learn/player/use-player.ts',
    'components/learn/blocks/example-block.tsx',
    'components/learn/blocks/code-lines.tsx',
    'components/learn/blocks/visual-block.tsx',
    'lib/learn/player.ts',
    'lib/learn/highlight.ts',
    'lib/learn/learn-visual.ts',
  ],
  states: [
    {
      id: 'strips',
      title: 'The strip in each place',
      path: '/learn/review',
      height: 560,
      render: () => (
        <main className="flex flex-col gap-8 py-8">
          <Labelled label="The review, lesson 3 of 6">
            <PlayerStrip
              crumbs={[LEARN, { label: 'Review' }]}
              end={<PlayerRunEnd squares={squaresOf(reviewRun)} words={runWordsOf('Lesson', reviewRun)} />}
            />
          </Labelled>
          <Labelled label="The review, opened from a course">
            <PlayerStrip
              crumbs={[LEARN, COURSE, { label: 'Review' }]}
              end={<PlayerRunEnd squares={squaresOf(reviewRun)} words={runWordsOf('Lesson', reviewRun)} />}
            />
          </Labelled>
          <Labelled label="The review, at its end">
            <PlayerStrip
              crumbs={[LEARN, { label: 'Review' }]}
              end={<PlayerRunEnd squares={squaresOf(endRun)} words={runWordsOf('Lesson', endRun)} />}
            />
          </Labelled>
          <Labelled label="The check, question 4 of 9: no right or wrong in its squares">
            <PlayerStrip
              crumbs={[LEARN, COURSE, { label: 'Check' }]}
              end={<PlayerRunEnd squares={squaresOf(checkRun)} words={runWordsOf('Question', checkRun)} />}
            />
          </Labelled>
          <Labelled label="A lesson, 3 of 9 in its group: no squares">
            <PlayerStrip
              crumbs={[LEARN, COURSE, { label: 'Big-O' }]}
              end={<PlayerRunEnd words={runWordsOf('Lesson', { at: 2, count: 9, results: [] })} />}
            />
          </Labelled>
        </main>
      ),
    },
    {
      id: 'review-card',
      title: 'The review’s card: the example highlighted, one picked',
      path: '/learn/review',
      height: 980,
      render: () => (
        <>
          <PlayerStrip
            crumbs={[LEARN, { label: 'Review' }]}
            end={<PlayerRunEnd squares={squaresOf(reviewRun)} words={runWordsOf('Lesson', reviewRun)} />}
          />
          <Column from="Hash maps">
            <AnswerPart
              question={reviewQuestion}
              answer={answerOf(reviewQuestion, [{ type: 'pick', at: 1 }])}
              place={reviewPlace(false)}
              highlighted={hasDuplicateCodes}
              hints
            />
          </Column>
        </>
      ),
    },
    {
      id: 'review-answered',
      title: 'The review’s card: a wrong pick, answered by the call',
      path: '/learn/review',
      height: 1060,
      render: () => (
        <>
          <PlayerStrip
            crumbs={[LEARN, { label: 'Review' }]}
            end={
              <PlayerRunEnd
                squares={squaresOf({ ...reviewRun, results: [...reviewRun.results, 'wrong'] })}
                words={runWordsOf('Lesson', reviewRun)}
              />
            }
          />
          <Column from="Hash maps">
            <AnswerPart
              question={reviewQuestion}
              answer={answerOf(reviewQuestion, [
                { type: 'pick', at: 1 },
                { type: 'sending' },
                { type: 'answered', right: false, key: reviewQuestionKeyed, language: 'python' },
              ])}
              place={reviewPlace(false)}
              highlighted={hasDuplicateCodes}
              hints
            />
          </Column>
        </>
      ),
    },
    {
      id: 'check-card',
      title: 'The check’s card under its strip',
      path: '/learn/check/algorithms',
      height: 900,
      render: () => (
        <>
          <PlayerStrip
            crumbs={[LEARN, COURSE, { label: 'Check' }]}
            end={<PlayerRunEnd squares={squaresOf(checkRun)} words={runWordsOf('Question', checkRun)} />}
          />
          <Column from="Stacks">
            <AnswerPart
              question={checkQuestion}
              answer={answerOf(checkQuestion, [])}
              place={checkPlace(false)}
              hints
              keyLineEnd={<span className="text-sm text-muted-foreground">Stop and see the result</span>}
            />
          </Column>
        </>
      ),
    },
    {
      id: 'blocks',
      title: 'Blocks: the example in three languages, one language, a line to pick, and each visual',
      path: '/learn/lessons/hash-maps',
      height: 2200,
      render: () => (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pt-8 pb-16">
          <ExampleBlock codes={hasDuplicateCodes} main="python" />
          <ExampleBlock codes={hasDuplicateCodes.slice(2)} />
          <QuestionPart
            question={pickLineQuestion}
            answer={answerOf(pickLineQuestion, [{ type: 'pick', at: 2 }])}
            highlighted={nestedLoopCodes}
          />
          <section className="flex flex-col gap-3">
            <span className="text-sm font-semibold">The lesson’s own question, under the lesson</span>
            <AnswerPart
              question={pickLineQuestion}
              answer={answerOf(pickLineQuestion, [{ type: 'pick', at: 2 }])}
              place={lessonPlace('Next: Big-O of two loops')}
              hints
            />
          </section>
          <VisualBlock visual={tableVisual} id="visual-table" />
          <VisualBlock visual={diagramVisual} id="visual-diagram" />
          <VisualBlock visual={compareVisual} id="visual-compare" />
        </main>
      ),
    },
  ],
};
