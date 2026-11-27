'use client';

import { AnswerPart, type AnswerPartPlace } from '@/components/workspace/question/answer-part';
import { useLearnAnswer } from '@/components/workspace/question/use-learn-answer';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import type { LearnAnswerState } from '@/lib/workspace/learn-answer';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * "Check yourself": the step's question, drawn with the shared question card. A step's question is public, with its
 * key, so anyone answers it here and the page grades it: a wrong pick shows its reason and the person picks again;
 * the right one shows why. Nothing is saved: in a build, the person's agent asks it.
 */

/** What the status slot says before a pick. */
export const STEP_QUESTION_NOTE = 'Pick one, then check. A wrong pick only shows you why, and you pick again.';

/** The line beside the card's keys. */
export const STEP_QUESTION_PRACTICE = 'Practice: nothing is saved here. In your build, your agent asks this.';

/** The card's place: a verdict shows, "Check", then "Answered"; the code of a `predict-output` question in the card. */
export const STEP_QUESTION_PLACE: AnswerPartPlace = {
  verdict: true,
  labels: { check: 'Check', done: 'Answered' },
  note: () => STEP_QUESTION_NOTE,
  withCode: true,
};

export function StepQuestion({
  question,
  language,
  highlighted,
  start,
  hints,
  onDone,
}: {
  question: LearnQuestion;
  /** The language the page shows: a `predict-output` question shows its code in it. */
  language: string | null;
  highlighted: readonly HighlightedCode[];
  /** Where the answer starts: the catalogue draws a wrong and a right pick. */
  start?: LearnAnswerState;
  hints?: boolean;
  /** "Answered": the next step's card is where the person goes on. */
  onDone: () => void;
}) {
  const answer = useLearnAnswer({ question, language, verdict: true, start, onDone });
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="build-step-question" data-build-step-question="">
      <h2 id="build-step-question" className="m-0 text-xl font-bold tracking-tight">
        Check yourself
      </h2>
      <AnswerPart
        question={question}
        answer={answer}
        place={STEP_QUESTION_PLACE}
        hints={hints}
        highlighted={highlighted}
        keyLineEnd={<span className="text-xs text-muted-foreground">{STEP_QUESTION_PRACTICE}</span>}
      />
    </section>
  );
}
