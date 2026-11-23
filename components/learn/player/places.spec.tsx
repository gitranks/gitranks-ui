// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkPlace, lessonPlace, reviewPlace } from './places';
import { QuestionPart } from '@/components/learn/question/question-part';
import type { LearnAnswer } from '@/components/learn/question/use-learn-answer';
import { pickLineQuestion } from '@/lib/learn/__fixtures__/learn-question';
import { nestedLoopCodes } from '@/lib/learn/__fixtures__/player';
import { answerStartOf } from '@/lib/learn/learn-answer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('the places that ask', () => {
  it('says in each place what a wrong pick does', () => {
    expect(lessonPlace('Next').note?.('PICK_ONE', null)).toBe(
      'Pick one, then check. A wrong pick only shows you why, and you pick again.',
    );
    expect(reviewPlace(false).note?.('PICK_ONE', null)).toBe(
      'Pick one, then check. Your first pick is the one that counts.',
    );
    expect(checkPlace(false).note?.('PICK_LINE', null)).toBe(
      'Click a line in the code, or press its number. We do not say right or wrong here: you see it all on the result.',
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

  it('draws the plain code when no colours came for the language', () => {
    act(() => root.render(<QuestionPart question={pickLineQuestion} answer={answer} />));
    expect(host.querySelectorAll('[data-line]')).toHaveLength(6);
    expect(host.querySelector('[data-line] span[style]')).toBeNull();
  });
});
