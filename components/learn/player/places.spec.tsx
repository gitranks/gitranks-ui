// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkPlace, lessonPlace, reviewPlace } from './places';
import { QuestionPart } from '@/components/workspace/question/question-part';
import type { LearnAnswer } from '@/components/workspace/question/use-learn-answer';
import { nestedLoopCodes } from '@/lib/learn/__fixtures__/player';
import { answerAfter, pickLineQuestion } from '@/lib/workspace/__fixtures__/learn-question';
import { answerStartOf, type LearnAnswerAction } from '@/lib/workspace/learn-answer';
import { verdictOf } from '@/lib/workspace/learn-question';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('the places that ask', () => {
  it('says in each place what a wrong pick does', () => {
    expect(lessonPlace('Next').note?.('PICK_ONE', null, false)).toBe(
      'Pick one, then check. A wrong pick only shows you why, and you pick again.',
    );
    expect(reviewPlace(false).note?.('PICK_ONE', null, false)).toBe(
      'Pick one, then check. Your first pick is the one that counts.',
    );
    expect(checkPlace(false).note?.('PICK_LINE', null, false)).toBe(
      'Click a line in the code, or press its number. We do not say right or wrong here: you see it all on the result.',
    );
  });

  it('tells the check’s “I don’t know” it is a fine answer', () => {
    expect(checkPlace(false).note?.('PICK_ONE', null, true)).toBe(
      'That is a fine answer. We start you in this group, and nothing counts against you.',
    );
  });

  it('gives the review a one-press extra choice, and the check one picked like an option', () => {
    expect(reviewPlace(true)).toMatchObject({ extra: 'I don’t remember', extraAnswers: true, verdict: true });
    expect(reviewPlace(true).labels.done).toBe('Finish the review');
    expect(checkPlace(true)).toMatchObject({ extra: 'I don’t know', verdict: false, withCode: true });
    expect(checkPlace(true).extraAnswers).toBeUndefined();
    expect(checkPlace(true).labels).toEqual({ check: 'See the result', done: 'See the result' });
  });
});

describe('a line to pick, highlighted', () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const answer: Pick<LearnAnswer, 'state' | 'language' | 'pick'> = {
    state: answerStartOf(pickLineQuestion),
    language: 'python',
    pick: () => {},
  };

  it('draws the server’s colours on each line, and the same lines as the plain code', () => {
    act(() => root.render(<QuestionPart question={pickLineQuestion} answer={answer} highlighted={nestedLoopCodes} />));
    const lines = [...host.querySelectorAll('[data-line]')];
    expect(lines).toHaveLength(6);
    expect(lines[2].textContent).toBe('3        for j in range(i + 1, len(nums)):');
    const keyword = lines[0].querySelector<HTMLElement>('span[style]');
    expect(keyword?.textContent).toBe('def');
    expect(keyword?.style.getPropertyValue('--shiki-light')).toBe('#d73a49');
  });

  it('draws a line marked right or wrong in its mark’s colour, not the code’s', () => {
    const graded: LearnAnswerAction = { type: 'graded', verdict: verdictOf(pickLineQuestion, 2, 'python')! };
    const state = answerAfter(pickLineQuestion, [{ type: 'pick', at: 1 }, graded]);
    act(() =>
      root.render(
        <QuestionPart question={pickLineQuestion} answer={{ ...answer, state }} highlighted={nestedLoopCodes} />,
      ),
    );
    expect(host.querySelector('[data-line="2"]')?.getAttribute('data-line-mark')).toBe('wrong');
    expect(host.querySelector('[data-line="2"] span[style]')).toBeNull();
    expect(host.querySelector('[data-line="1"] span[style]')).not.toBeNull();
  });

  it('draws the plain code when the colours do not count the same lines', () => {
    const short = [{ ...nestedLoopCodes[0], lines: nestedLoopCodes[0].lines.slice(0, 4) }];
    act(() => root.render(<QuestionPart question={pickLineQuestion} answer={answer} highlighted={short} />));
    expect(host.querySelectorAll('[data-line]')).toHaveLength(6);
    expect(host.querySelector('[data-line] span[style]')).toBeNull();
  });

  it('draws the plain code when no colours came for the language', () => {
    act(() => root.render(<QuestionPart question={pickLineQuestion} answer={answer} />));
    expect(host.querySelectorAll('[data-line]')).toHaveLength(6);
    expect(host.querySelector('[data-line] span[style]')).toBeNull();
  });
});
