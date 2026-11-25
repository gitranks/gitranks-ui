import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { AnswerPart, type AnswerPartPlace } from '@/components/learn/question/answer-part';
import { QuestionPart } from '@/components/learn/question/question-part';
import type { LearnAnswer } from '@/components/learn/question/use-learn-answer';
import {
  answerAfter,
  checkQuestion,
  mythQuestion,
  orderQuestion,
  outputQuestion,
  pickAllQuestion,
  pickLineQuestion,
  pickOneQuestion,
} from '@/lib/learn/__fixtures__/learn-question';
import { canSendOf, type LearnAnswerAction } from '@/lib/learn/learn-answer';
import { codeOf, type LearnQuestion, verdictOf } from '@/lib/learn/learn-question';

const noop = () => {};

/** An answer that stands still in a state, as the engine would have moved it there. */
function answerOf(question: LearnQuestion, actions: LearnAnswerAction[]): LearnAnswer {
  const state = answerAfter(question, actions);
  return {
    state,
    language: codeOf(question, 'python')?.language ?? 'python',
    canSend: canSendOf(question, state),
    pick: noop,
    extra: noop,
    myth: noop,
    move: noop,
    step: noop,
    main: noop,
  };
}

/** The page's own verdict on a pick, as the engine grades it. */
const graded = (question: LearnQuestion, picked: Parameters<typeof verdictOf>[1]): LearnAnswerAction => ({
  type: 'graded',
  verdict: verdictOf(question, picked, 'python')!,
});

const LESSON: AnswerPartPlace = { verdict: true, labels: { check: 'Check', done: 'Next: Big-O of two loops' } };
const MYTH_LESSON: AnswerPartPlace = { verdict: true, labels: { check: 'Check', done: 'Next' } };
const CHECK: AnswerPartPlace = {
  verdict: false,
  extra: 'I don’t know',
  labels: { check: 'Next question', done: 'Next question' },
  note: () => 'Pick one. We do not say right or wrong here: you see it all on the result.',
  withCode: true,
};

/** A lesson's two columns as the boards draw them, the lesson itself left out (it comes with the lesson's page). */
function LessonColumns({
  title,
  question,
  answer,
  place = LESSON,
}: {
  title: string;
  question: LearnQuestion;
  answer: LearnAnswer;
  place?: AnswerPartPlace;
}) {
  return (
    <div className="grid items-start gap-10" style={{ gridTemplateColumns: 'minmax(0,1fr) 27rem' }}>
      <article className="flex min-w-0 flex-col gap-5">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-balance">{title}</h1>
        <QuestionPart question={question} answer={answer} />
      </article>
      <aside className="flex min-w-0 flex-col gap-4">
        <AnswerPart question={question} answer={answer} place={place} hints />
      </aside>
    </div>
  );
}

function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pt-8 pb-16">{children}</main>;
}

/** One answered card with the words above it that say which state it is. */
function Answered({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </section>
  );
}

/** The question and answer parts in each state the "question types" boards draw. */
export const LEARN_QUESTION_SCREEN: Screen = {
  id: 'learn-question-types',
  title: 'A question, each kind',
  area: 'learn',
  route: '/learn/lessons/big-o',
  sources: [
    'components/learn/question/answer-part.tsx',
    'components/learn/question/question-part.tsx',
    'components/learn/question/kbd.tsx',
    'components/workspace/kbd.tsx',
    'components/learn/question/use-learn-answer.ts',
    'lib/learn/learn-question.ts',
    'lib/learn/learn-answer.ts',
  ],
  states: [
    {
      id: 'multi',
      title: 'Pick all that apply, one picked',
      path: '/learn/lessons/hash-maps',
      height: 720,
      render: () => (
        <Page>
          <LessonColumns
            title="A hash map finds a value by its key"
            question={pickAllQuestion}
            answer={answerOf(pickAllQuestion, [{ type: 'pick', at: 0 }])}
          />
        </Page>
      ),
    },
    {
      id: 'line',
      title: 'Pick the line, line 2 picked',
      path: '/learn/lessons/big-o',
      height: 640,
      render: () => (
        <Page>
          <LessonColumns
            title="A loop inside a loop makes the work grow fast"
            question={pickLineQuestion}
            answer={answerOf(pickLineQuestion, [{ type: 'pick', at: 1 }])}
          />
        </Page>
      ),
    },
    {
      id: 'myth',
      title: 'Myth or fact, before an answer',
      path: '/learn/lessons/indexes',
      height: 640,
      render: () => (
        <Page>
          <LessonColumns
            title="An index makes reads faster and writes slower"
            question={mythQuestion}
            answer={answerOf(mythQuestion, [])}
            place={MYTH_LESSON}
          />
        </Page>
      ),
    },
    {
      id: 'order',
      title: 'Put in order, row 2 picked to move',
      path: '/learn/lessons/binary-search',
      height: 640,
      render: () => (
        <Page>
          <LessonColumns
            title="Binary search halves the list each step"
            question={orderQuestion}
            answer={answerOf(orderQuestion, [{ type: 'pick', at: 1 }])}
          />
        </Page>
      ),
    },
    {
      id: 'output',
      title: 'Predict the output, one picked',
      path: '/learn/lessons/stacks',
      height: 640,
      render: () => (
        <Page>
          <LessonColumns
            title="A stack gives back the last thing put in"
            question={outputQuestion}
            answer={answerOf(outputQuestion, [{ type: 'pick', at: 1 }])}
          />
        </Page>
      ),
    },
    {
      id: 'answered',
      title: 'After an answer: wrong and picking again, right, and each kind right',
      path: '/learn/lessons/binary-search',
      height: 3500,
      render: () => (
        <Page>
          <Answered label="Pick one: a wrong pick, crossed out; the others stay open">
            <LessonColumns
              title="Binary search needs a sorted list"
              question={pickOneQuestion}
              answer={answerOf(pickOneQuestion, [{ type: 'pick', at: 0 }, graded(pickOneQuestion, 0)])}
            />
          </Answered>
          <Answered label="Pick one: right on the second try">
            <LessonColumns
              title="Binary search needs a sorted list"
              question={pickOneQuestion}
              answer={answerOf(pickOneQuestion, [
                { type: 'pick', at: 0 },
                graded(pickOneQuestion, 0),
                { type: 'pick', at: 1 },
                graded(pickOneQuestion, 1),
              ])}
            />
          </Answered>
          <Answered label="Predict the output: right, and what it prints">
            <LessonColumns
              title="A stack gives back the last thing put in"
              question={outputQuestion}
              answer={answerOf(outputQuestion, [{ type: 'pick', at: 1 }, graded(outputQuestion, 1)])}
            />
          </Answered>
          <Answered label="Pick the line: a wrong line, crossed out">
            <LessonColumns
              title="A loop inside a loop makes the work grow fast"
              question={pickLineQuestion}
              answer={answerOf(pickLineQuestion, [{ type: 'pick', at: 1 }, graded(pickLineQuestion, 2)])}
            />
          </Answered>
          <Answered label="Put in order: right">
            <LessonColumns
              title="Binary search halves the list each step"
              question={orderQuestion}
              answer={answerOf(orderQuestion, [
                { type: 'move', from: 1, to: 0 },
                { type: 'move', from: 2, to: 1 },
                graded(orderQuestion, ['r2', 'r3', 'r1']),
              ])}
            />
          </Answered>
          <Answered label="Myth or fact: right">
            <LessonColumns
              title="An index makes reads faster and writes slower"
              question={mythQuestion}
              answer={answerOf(mythQuestion, [{ type: 'myth', answer: 'myth' }, graded(mythQuestion, 'myth')])}
              place={MYTH_LESSON}
            />
          </Answered>
        </Page>
      ),
    },
    {
      id: 'check',
      title: 'The check’s card: no verdict, “I don’t know”, the code in the card',
      path: '/learn/check/algorithms',
      height: 760,
      render: () => (
        <Page>
          <div className="mx-auto flex w-full flex-col gap-4" style={{ maxWidth: 560 }}>
            <AnswerPart
              question={checkQuestion}
              answer={answerOf(checkQuestion, [])}
              place={CHECK}
              hints
              keyLineEnd={<span className="text-sm text-muted-foreground">Stop and see the result</span>}
            />
          </div>
        </Page>
      ),
    },
  ],
};
