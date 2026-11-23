import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { ExampleBlock } from '@/components/learn/blocks/example-block';
import { VisualBlock } from '@/components/learn/blocks/visual-block';
import {
  CheckFrame,
  CheckMessage,
  type CheckMode,
  CheckPending,
  CheckQuestionCard,
  checkResultEndOf,
  KnownCard,
  KnownList,
  KnownSheet,
} from '@/components/learn/check/check-parts';
import { lessonPlace } from '@/components/learn/player/places';
import { type PlayerCrumb, PlayerRunEnd, PlayerStrip } from '@/components/learn/player/player-strip';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { QuestionPart } from '@/components/learn/question/question-part';
import type { LearnAnswer } from '@/components/learn/question/use-learn-answer';
import {
  ReviewCard,
  ReviewEmpty,
  ReviewEnd,
  ReviewFailed,
  ReviewFrame,
  ReviewPending,
  ReviewVisitor,
} from '@/components/learn/review/review-parts';
import { Button } from '@/components/ui/button';
import {
  checkResult,
  checkResultAll,
  checkResultNone,
  checkRunOf,
  knownSinceMine,
} from '@/lib/learn/__fixtures__/check';
import { algorithmsCourse } from '@/lib/learn/__fixtures__/course';
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
import {
  algorithms,
  reviewDone,
  reviewDoneTen,
  reviewItem,
  reviewNext,
  reviewReply,
  reviewSideEmpty,
} from '@/lib/learn/__fixtures__/review';
import {
  checkIntroOf,
  checkTitleOf,
  checkVisitorTextOf,
  handWordsOf,
  type KnownGroup,
  knownCountsOf,
  knownGroupsOfCourse,
  knownGroupsOfResult,
  type LearnCheckGroup,
  startOf,
  tickedFirstOf,
} from '@/lib/learn/check';
import { canSendOf, type LearnAnswerAction } from '@/lib/learn/learn-answer';
import type { LearnQuestion } from '@/lib/learn/learn-question';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import { type PlayerRun, runWordsOf, squaresOf } from '@/lib/learn/player';
import type { LearnReviewChange } from '@/lib/learn/review';

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

/** One state on a board: its name, then the page as its route draws it, cut at `height`. */
function Frame({ title, height, children }: { title: string; height: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-sm font-semibold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl border bg-background" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

/** The review's page under its strip, at a point of its run (no squares before the set is read). */
function Review({ course, run, children }: { course: LearnLessonLink | null; run?: PlayerRun; children: ReactNode }) {
  return (
    <ReviewFrame
      course={course}
      end={run ? <PlayerRunEnd squares={squaresOf(run)} words={runWordsOf('Lesson', run)} /> : undefined}
    >
      {children}
    </ReviewFrame>
  );
}

/** A fixed day, so the board's "in 2 days" never moves. */
const NOW = new Date(2026, 10, 23, 9);

const tenRun: PlayerRun = {
  at: 10,
  count: 10,
  results: Array.from({ length: 10 }, (_, at) => (at % 4 === 1 ? 'wrong' : 'right')),
};

/** The run once a lesson is answered: the third of six, or the last. */
const answeredRunOf = (last: boolean, change: LearnReviewChange): PlayerRun => {
  const result = change === 'BACK_TOMORROW' ? 'wrong' : 'right';
  return last
    ? { at: 5, count: 6, results: [...endRun.results.slice(0, 5), result] }
    : { ...reviewRun, results: [...reviewRun.results, result] };
};

/** The answered card in each outcome page 16 draws. */
const ANSWERED: {
  title: string;
  change: LearnReviewChange;
  forgot: boolean;
  last: boolean;
  course: LearnLessonLink | null;
}[] = [
  {
    title: 'Right: Practised now, the lesson named above the card',
    change: 'PRACTISED',
    forgot: false,
    last: false,
    course: null,
  },
  { title: 'Right on a Practised lesson: Mastered now', change: 'MASTERED', forgot: false, last: false, course: null },
  { title: 'A wrong pick: it comes back tomorrow', change: 'BACK_TOMORROW', forgot: false, last: false, course: null },
  {
    title: '“I don’t remember”: it comes back tomorrow',
    change: 'BACK_TOMORROW',
    forgot: true,
    last: false,
    course: null,
  },
  {
    title: 'The last lesson, the review opened from a course: “Finish the review”',
    change: 'PRACTISED',
    forgot: false,
    last: true,
    course: algorithms,
  },
];

const CHECK_COURSE = { slug: algorithmsCourse.slug, title: algorithmsCourse.name };

/** The check's question 4: "Stacks and queues". */
const checkAsked = { ...checkRunOf(3).questions[3], question: checkQuestion };

/** The check's page under its strip, at a point of its run. */
function Check({ run, children }: { run: PlayerRun; children: ReactNode }) {
  return (
    <CheckFrame
      course={CHECK_COURSE}
      mode="check"
      end={<PlayerRunEnd squares={squaresOf(run)} words={runWordsOf('Question', run)} />}
    >
      {children}
    </CheckFrame>
  );
}

/** Every lesson but the last of the course, ticked by hand on the board's result. */
const HAND_TICKED = algorithmsCourse.groups.flatMap((group) => group.lessons.map((lesson) => lesson.slug)).slice(0, -1);

/** The sheet's card for a state, with the buttons the live page gives it. */
function SheetCard({ mode, groups, ticked }: { mode: CheckMode; groups: KnownGroup[]; ticked: ReadonlySet<string> }) {
  const counts = knownCountsOf(groups, ticked);
  const start = startOf(groups, ticked);
  const act = noop;
  const [primary, secondary] =
    mode === 'known'
      ? [{ label: 'Save', act }, null]
      : !start
        ? [{ label: 'Save and pick another course', act }, null]
        : !counts.known && !counts.learned
          ? [{ label: 'Start at the first lesson', act }, null]
          : [
              { label: 'Save and start there', act },
              counts.known ? { label: 'Mark nothing and start at lesson 1', act } : null,
            ];
  return (
    <KnownCard
      mode={mode}
      counts={counts}
      start={start}
      hand={mode === 'check' ? handWordsOf(groups, ticked) : null}
      primary={primary}
      secondary={secondary}
      hints
    />
  );
}

/** The check's result for a state: our guess, then what the person ticked or unticked, a group opened. */
function Sheet({
  result,
  tick = [],
  untick = [],
  open,
}: {
  result: LearnCheckGroup[];
  tick?: readonly string[];
  untick?: readonly string[];
  open?: string;
}) {
  const groups = knownGroupsOfResult(result);
  const ticked = new Set([...tickedFirstOf(groups), ...tick].filter((slug) => !untick.includes(slug)));
  return (
    <CheckFrame course={CHECK_COURSE} mode="check" wide end={checkResultEndOf(result)}>
      <KnownSheet
        state="result"
        title={checkTitleOf(groups)}
        intro={checkIntroOf(groups)}
        list={
          <KnownList
            groups={groups}
            ticked={ticked}
            opened={new Set(open ? [open] : tick.length ? [groups[groups.length - 1].slug] : [])}
            onGroup={noop}
            onLesson={noop}
            onOpen={noop}
          />
        }
        card={<SheetCard mode="check" groups={groups} ticked={ticked} />}
      />
    </CheckFrame>
  );
}

/** "What you know": the saved marks, three lessons of a group learned since. */
function Known() {
  const groups = knownGroupsOfCourse(algorithmsCourse, knownSinceMine);
  const ticked = tickedFirstOf(groups);
  return (
    <CheckFrame course={CHECK_COURSE} mode="known" wide>
      <KnownSheet
        state="known"
        title="What you already know in this course"
        intro="Tick the lessons you know without answering them, or untick the ones you want to learn after all. A lesson you learned by answering stays learned."
        list={
          <KnownList
            groups={groups}
            ticked={ticked}
            opened={new Set(['hash-maps-and-sets'])}
            onGroup={noop}
            onLesson={noop}
            onOpen={noop}
          />
        }
        card={<SheetCard mode="known" groups={groups} ticked={ticked} />}
      />
    </CheckFrame>
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
    'components/learn/review/review-parts.tsx',
    'components/learn/check/check-parts.tsx',
    'lib/learn/check.ts',
    'lib/learn/review.ts',
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
      title: 'The review before an answer, and its end: all repeated, more due, nothing due, signed out, loading',
      path: '/learn/review',
      height: 4500,
      render: () => (
        <div className="flex flex-col gap-8 p-6">
          <Frame title="A lesson, one picked: its course above the card, not its name" height={980}>
            <Review course={null} run={reviewRun}>
              <ReviewCard
                item={reviewItem('r3')}
                answer={answerOf(reviewQuestion, [{ type: 'pick', at: 1 }])}
                last={false}
                reply={null}
                forgot={false}
                hints
              />
            </Review>
          </Frame>
          <Frame title="The end: each lesson of the set, what changed for it, and the next lesson" height={720}>
            <Review course={null} run={endRun}>
              <ReviewEnd done={reviewDone} more={0} next={reviewNext} hints onMore={noop} />
            </Review>
          </Frame>
          <Frame title="The end with more due: today’s ten, how many wait, and the way on" height={960}>
            <Review course={null} run={tenRun}>
              <ReviewEnd done={reviewDoneTen} more={14} next={reviewNext} hints onMore={noop} />
            </Review>
          </Frame>
          <Frame title="Nothing due: when the next review is, and the next lesson" height={300}>
            <Review course={null}>
              <ReviewEmpty {...reviewSideEmpty(NOW)} now={NOW} hints />
            </Review>
          </Frame>
          <Frame title="Signed out (an ended session): what the review is for, and the way in" height={300}>
            <Review course={null}>
              <ReviewVisitor onSignIn={noop} />
            </Review>
          </Frame>
          <Frame title="While the set is on its way: the card’s place, of its size" height={480}>
            <Review course={null}>
              <ReviewPending />
            </Review>
          </Frame>
          <Frame title="The set did not come: nothing is lost, and the way to read it again" height={300}>
            <Review course={null}>
              <ReviewFailed onReload={noop} />
            </Review>
          </Frame>
        </div>
      ),
    },
    {
      id: 'review-answered',
      title: 'The review’s card answered: Practised now, Mastered now, a wrong pick, “I don’t remember”, the last one',
      path: '/learn/review',
      height: 5260,
      render: () => (
        <div className="flex flex-col gap-8 p-6">
          {ANSWERED.map(({ title, change, forgot, last, course }) => (
            <Frame key={title} title={title} height={1000}>
              <Review course={course} run={answeredRunOf(last, change)}>
                <ReviewCard
                  item={reviewItem('r3')}
                  answer={answerOf(reviewQuestion, [
                    forgot ? { type: 'extra' } : { type: 'pick', at: change === 'BACK_TOMORROW' ? 1 : 0 },
                    { type: 'sending' },
                    {
                      type: 'answered',
                      right: change !== 'BACK_TOMORROW',
                      key: reviewQuestionKeyed,
                      language: 'python',
                    },
                  ])}
                  last={last}
                  reply={reviewReply(change)}
                  forgot={forgot}
                  hints
                />
              </Review>
            </Frame>
          ))}
        </div>
      ),
    },
    {
      id: 'check-card',
      title: 'The check: a question, “I don’t know”, the result, nothing known, all known, by hand, What you know',
      path: '/learn/check/algorithms',
      height: 9300,
      render: () => (
        <div className="flex flex-col gap-8 p-6">
          <Frame title="Question 4 of 9: the group above the card, no right or wrong, and the way to stop" height={900}>
            <Check run={checkRun}>
              <CheckQuestionCard
                asked={checkAsked}
                answer={answerOf(checkQuestion, [])}
                last={false}
                hints
                onStop={noop}
              />
            </Check>
          </Frame>
          <Frame title="“I don’t know” picked: a fine answer, and the button goes on" height={900}>
            <Check run={checkRun}>
              <CheckQuestionCard
                asked={checkAsked}
                answer={answerOf(checkQuestion, [{ type: 'extra' }])}
                last={false}
                hints
                onStop={noop}
              />
            </Check>
          </Frame>
          <Frame title="The result: our guess, a group opened and two lessons unticked by hand" height={1240}>
            <Sheet
              result={checkResult}
              untick={['what-happens-when-two-keys-collide', 'when-a-hash-map-is-the-wrong-choice']}
              open="hash-maps-and-sets"
            />
          </Frame>
          <Frame title="Nothing right: nothing is marked, and the person can still tick what they know" height={1000}>
            <Sheet result={checkResultNone} />
          </Frame>
          <Frame title="Every answer right: all lessons marked, no lesson left to start at" height={1000}>
            <Sheet result={checkResultAll} />
          </Frame>
          <Frame title="Ticked by hand: the card says how many, and where the person starts" height={1100}>
            <Sheet result={checkResult} tick={HAND_TICKED} />
          </Frame>
          <Frame title="What you know, opened from the course: learned lessons shown and kept" height={1240}>
            <Known />
          </Frame>
          <Frame title="Signed out (an ended session): what the check does, and the way in" height={320}>
            <CheckFrame course={CHECK_COURSE} mode="check">
              <CheckMessage
                state="visitor"
                title="The check needs an account"
                text={checkVisitorTextOf(algorithmsCourse)}
              >
                <Button type="button" size="lg" className="min-h-11 font-semibold">
                  Sign in with GitHub
                </Button>
              </CheckMessage>
            </CheckFrame>
          </Frame>
          <Frame title="While the run is on its way: the card’s place, of its size" height={480}>
            <CheckFrame course={CHECK_COURSE} mode="check">
              <CheckPending />
            </CheckFrame>
          </Frame>
          <Frame title="The run did not come, and a course whose check is closed just now" height={560}>
            <CheckFrame course={CHECK_COURSE} mode="check">
              <CheckMessage
                state="failed"
                title="Your check did not load"
                text="Your progress is safe; we could not read it just now. Try again in a minute."
              >
                <Button type="button" size="lg" className="min-h-11 font-semibold">
                  Try again
                </Button>
              </CheckMessage>
              <CheckMessage
                state="missing"
                title="This course has no check just now"
                text="The check comes back once every group of the course is open again. Its lessons are still open to you."
              >
                <Button type="button" size="lg" className="min-h-11 font-semibold">
                  Back to the course
                </Button>
              </CheckMessage>
            </CheckFrame>
          </Frame>
        </div>
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
