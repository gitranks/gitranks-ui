// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnswerPart, type AnswerPartPlace } from './answer-part';
import { QuestionPart } from './question-part';
import { type LearnAnswerOptions, useLearnAnswer } from './use-learn-answer';
import {
  checkQuestion,
  mythQuestion,
  pickLineQuestion,
  pickOneQuestion,
} from '@/lib/learn/__fixtures__/learn-question';
import type { LearnQuestion } from '@/lib/learn/learn-question';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LESSON: AnswerPartPlace = { verdict: true, labels: { check: 'Check', done: 'Next: Stacks' } };
const CHECK: AnswerPartPlace = {
  verdict: false,
  extra: 'I don’t know',
  labels: { check: 'Next question', done: 'Next question' },
};

function Harness({ place, ...options }: Omit<LearnAnswerOptions, 'verdict'> & { place: AnswerPartPlace }) {
  const answer = useLearnAnswer({ ...options, verdict: place.verdict, extra: !!place.extra });
  return (
    <>
      <QuestionPart question={options.question} answer={answer} />
      <AnswerPart question={options.question} answer={answer} place={place} hints={false} />
    </>
  );
}

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  // jsdom has no matchMedia: a coarse pointer, as a phone.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function draw(props: Partial<LearnAnswerOptions> & { question: LearnQuestion; place?: AnswerPartPlace }) {
  const onDone = props.onDone ?? vi.fn();
  act(() => root.render(<Harness language="python" onDone={onDone} place={LESSON} {...props} />));
  return onDone;
}

const status = () => host.querySelector('[role=status]')!;
const main = () => host.querySelector<HTMLButtonElement>('[data-answer-main]')!;
const option = (index: number | 'extra') => host.querySelector<HTMLInputElement>(`[data-option="${index}"] input`)!;
const press = (key: string) =>
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
const click = (element: HTMLElement) => act(() => element.click());

describe('a lesson’s keyed question', () => {
  it('crosses out a wrong pick and says why, then gives the verdict on a right one', () => {
    const onGraded = vi.fn();
    const onDone = draw({ question: pickOneQuestion, onGraded });
    expect(main().disabled).toBe(true);
    click(option(0));
    click(main());
    expect(status().textContent).toBe(
      'Not quite. Repeated items are fine: the search still halves the list. Pick again.',
    );
    expect(host.querySelector('[data-option="0"]')?.getAttribute('data-option-mark')).toBe('wrong');
    expect(option(0).disabled).toBe(true);
    expect(onGraded).toHaveBeenLastCalledWith({ picked: 0, right: false, tries: 1, language: 'python' });

    click(option(1));
    expect(status().textContent).toBe('Pick one, then check.');
    click(main());
    expect(status().textContent).toMatch(/^Right\. Each step throws away/);
    expect(onGraded).toHaveBeenLastCalledWith({ picked: 1, right: true, tries: 2, language: 'python' });
    expect(main().textContent).toBe('Next: Stacks');
    click(main());
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('answers with the keys: a number picks, Enter checks, Enter again goes on', () => {
    const onDone = draw({ question: pickOneQuestion });
    press('2');
    expect(option(1).checked).toBe(true);
    press('Enter');
    expect(status().textContent).toMatch(/^Right\./);
    press('Enter');
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('leaves keys typed into a field alone', () => {
    draw({ question: pickOneQuestion });
    const field = document.createElement('input');
    document.body.append(field);
    act(() => {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    });
    expect(option(1).checked).toBe(false);
    field.remove();
  });

  it('picks a line in the code and checks it', () => {
    draw({ question: pickLineQuestion });
    click(host.querySelector<HTMLButtonElement>('[data-line="2"]')!);
    expect(host.querySelector('[data-your-pick]')?.textContent).toBe('Your pickLine 2');
    click(main());
    expect(host.querySelector('[data-line="2"]')?.getAttribute('data-line-mark')).toBe('wrong');
    expect(host.querySelector('[data-your-pick]')?.textContent).toBe('Your pickPick another line');
    press('3');
    press('Enter');
    expect(host.querySelector('[data-line="3"]')?.getAttribute('data-line-mark')).toBe('right');
  });

  it('answers myth or fact in one press', () => {
    draw({ question: mythQuestion, place: { ...LESSON, labels: { check: 'Check', done: 'Next' } } });
    expect(main().disabled).toBe(true);
    click(host.querySelector<HTMLButtonElement>('[data-myth="fact"]')!);
    expect(status().textContent).toMatch(/^Not quite\. An index speeds up/);
    expect(host.querySelector('[data-myth="myth"]')?.getAttribute('data-option-mark')).toBe('right');
    expect(main().disabled).toBe(false);
  });
});

describe('a keyless question', () => {
  const keyed: LearnQuestion = {
    ...checkQuestion,
    content: {
      options: [
        { text: '1', right: false, why: 'First in is last out.' },
        { text: '3', right: true, why: 'The last one in comes out first.' },
        { text: '2', right: false, why: 'Not the middle.' },
      ],
    },
  };

  it('waits for the call’s verdict, then marks what the key it brought says', async () => {
    let reply: (value: { right: boolean; question: LearnQuestion }) => void = () => {};
    const send = vi.fn(() => new Promise<{ right: boolean; question: LearnQuestion }>((resolve) => (reply = resolve)));
    draw({
      question: checkQuestion,
      send,
      place: { verdict: true, extra: 'I don’t remember', labels: { check: 'Check', done: 'Next' } },
    });
    click(option(0));
    click(main());
    expect(send).toHaveBeenCalledWith({ picked: 0, extra: false, language: 'python' });
    expect(status().textContent).toBe('Sending your answer…');
    expect(main().disabled).toBe(true);
    await act(async () => reply({ right: false, question: keyed }));
    expect(status().textContent).toBe('Not quite. The last one in comes out first.');
    expect(host.querySelector('[data-option="1"]')?.getAttribute('data-option-mark')).toBe('right');
    expect(host.querySelector('[data-option="0"]')?.getAttribute('data-option-mark')).toBe('wrong');
  });

  it('sends the extra choice and goes on at once where no verdict shows', async () => {
    const send = vi.fn(async () => ({ right: false }));
    const onDone = vi.fn();
    draw({ question: checkQuestion, send, onDone, place: CHECK });
    press('0');
    expect(option('extra').checked).toBe(true);
    await act(async () => press('Enter'));
    expect(send).toHaveBeenCalledWith({ picked: null, extra: true, language: 'python' });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('keeps the pick when the call fails, and sends it again', async () => {
    const send = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ right: true });
    const onDone = vi.fn();
    draw({ question: checkQuestion, send, onDone, place: CHECK });
    click(option(2));
    await act(async () => click(main()));
    expect(status().textContent).toBe('Not sent. Your answer did not reach us. Try again.');
    expect(option(2).checked).toBe(true);
    await act(async () => click(main()));
    expect(send).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledOnce();
  });
});
