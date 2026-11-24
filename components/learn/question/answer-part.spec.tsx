// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnswerPart, type AnswerPartPlace } from './answer-part';
import { QuestionPart } from './question-part';
import { type LearnAnswerOptions, useLearnAnswer } from './use-learn-answer';
import {
  checkQuestion,
  mythQuestion,
  orderQuestion,
  pickAllQuestion,
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
const press = (key: string, on: HTMLElement = document.body, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    on.dispatchEvent(event);
  });
  return event;
};
const click = (element: HTMLElement) => act(() => element.click());
/** Enter on a focused button as a browser does it: the page's keys first, then the button's own press if left to it. */
const enterOn = async (button: HTMLElement) => {
  button.focus();
  const event = press('Enter', button);
  await act(async () => {
    if (!event.defaultPrevented) button.click();
  });
  return event;
};

describe('a lesson’s keyed question', () => {
  it('crosses out a wrong pick and says why, then gives the verdict on a right one', () => {
    const onGraded = vi.fn();
    const onDone = draw({ question: pickOneQuestion, onGraded });
    expect(main().getAttribute('aria-disabled')).toBe('true');
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

  it('lands the focus on the result once a pick is checked, never on the page', () => {
    draw({ question: pickOneQuestion });
    option(0).focus();
    press('1', option(0));
    press('Enter', option(0));
    // The wrong pick is disabled: the focus goes to the status saying why.
    expect(option(0).disabled).toBe(true);
    expect(document.activeElement).toBe(status());
    option(1).focus();
    press('2', option(1));
    press('Enter', option(1));
    expect(status().textContent).toMatch(/^Right\./);
    expect(document.activeElement).toBe(main());
  });

  it('leaves a focus that stays usable where it is', () => {
    draw({ question: pickOneQuestion });
    click(option(1));
    main().focus();
    click(main());
    expect(document.activeElement).toBe(main());
  });

  it('takes no focus where no verdict shows', async () => {
    draw({ question: pickOneQuestion, place: CHECK });
    option(1).focus();
    press('2', option(1));
    await act(async () => {
      press('Enter', option(1));
    });
    expect(document.activeElement).not.toBe(main());
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
    expect(main().getAttribute('aria-disabled')).toBe('true');
    click(host.querySelector<HTMLButtonElement>('[data-myth="fact"]')!);
    expect(status().textContent).toMatch(/^Not quite\. An index speeds up/);
    expect(host.querySelector('[data-myth="myth"]')?.getAttribute('data-option-mark')).toBe('right');
    expect(main().getAttribute('aria-disabled')).toBeNull();
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
    expect(main().getAttribute('aria-disabled')).toBe('true');
    await act(async () => reply({ right: false, question: keyed }));
    expect(status().textContent).toBe('Not quite. First in is last out. The last one in comes out first.');
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

describe('the keys and the focus', () => {
  it('takes Enter on a focused line or row as the main key', () => {
    draw({ question: pickLineQuestion });
    const line = host.querySelector<HTMLButtonElement>('[data-line="3"]')!;
    click(line);
    line.focus();
    press('Enter', line);
    expect(status().textContent).toMatch(/^Right\./);
  });

  it('answers with the focused Myth or Fact on Enter where a verdict shows, and goes on once answered', async () => {
    const onDone = draw({ question: mythQuestion, place: { ...LESSON, labels: { check: 'Check', done: 'Next' } } });
    const fact = host.querySelector<HTMLButtonElement>('[data-myth="fact"]')!;
    const event = await enterOn(fact);
    expect(event.defaultPrevented).toBe(false);
    expect(host.querySelector('[data-answer-part]')?.getAttribute('data-answer-phase')).not.toBe('open');
    expect(fact.getAttribute('aria-pressed')).toBe('true');
    // Once answered, Enter on it is the main button again.
    expect(press('Enter', fact).defaultPrevented).toBe(true);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('takes Enter on a focused Myth or Fact as the main key where no verdict shows', async () => {
    const send = vi.fn(async () => ({ right: false }));
    const onDone = vi.fn();
    draw({ question: mythQuestion, send, onDone, place: CHECK });
    const myth = host.querySelector<HTMLButtonElement>('[data-myth="myth"]')!;
    click(myth);
    expect(send).not.toHaveBeenCalled();
    expect((await enterOn(myth)).defaultPrevented).toBe(true);
    expect(send).toHaveBeenCalledWith({ picked: 'myth', extra: false, language: 'python' });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('leaves Enter on another button to that button', () => {
    draw({ question: pickOneQuestion });
    click(option(1));
    const other = document.createElement('button');
    document.body.append(other);
    const event = press('Enter', other);
    expect(event.defaultPrevented).toBe(false);
    expect(status().textContent).toBe('Pick one, then check.');
    other.remove();
  });

  it('acts once for a held key', () => {
    const onDone = draw({ question: pickOneQuestion });
    press('2');
    press('Enter');
    press('Enter', document.body, { repeat: true });
    expect(status().textContent).toMatch(/^Right\./);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('leaves keys typed in a menu alone', () => {
    draw({ question: mythQuestion, place: { ...LESSON, labels: { check: 'Check', done: 'Next' } } });
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('div');
    menu.append(item);
    document.body.append(menu);
    press('f', item);
    expect(host.querySelector('[data-answer-part]')?.getAttribute('data-answer-phase')).toBe('open');
    menu.remove();
  });

  it('keeps the main button focusable while it cannot be pressed', () => {
    draw({ question: pickOneQuestion });
    expect(main().disabled).toBe(false);
    expect(main().getAttribute('aria-disabled')).toBe('true');
    click(main());
    expect(status().textContent).toBe('Pick one, then check.');
  });
});

describe('put in order, in the card', () => {
  const rows = () => [...host.querySelectorAll('[data-order-row]')].map((row) => row.getAttribute('data-order-row'));

  it('picks a row by its number, moves it with the arrows, and checks the order', () => {
    draw({ question: orderQuestion });
    // No row picked: the arrows are the page's.
    expect(press('ArrowDown').defaultPrevented).toBe(false);
    press('2');
    expect(press('ArrowUp').defaultPrevented).toBe(true);
    expect(rows()).toEqual(['r2', 'r1', 'r3']);
    press('Enter');
    expect(status().textContent).toBe('Not quite. Some rows are out of place. Move the rows, then check again.');
    click(host.querySelectorAll<HTMLButtonElement>('[aria-label="Move up"]')[2]);
    expect(rows()).toEqual(['r2', 'r3', 'r1']);
    click(main());
    expect(status().textContent).toMatch(/^Right\. Look at the middle/);
  });
});

describe('pick all, in the card', () => {
  it('crosses out one wrong pick, and says when one true one is missing', () => {
    draw({ question: pickAllQuestion });
    for (const index of [0, 1, 3]) click(option(index));
    click(main());
    expect(host.querySelector('[data-option="1"]')?.getAttribute('data-option-mark')).toBe('wrong');
    expect(host.querySelector('[data-option="3"]')?.getAttribute('data-option-mark')).toBe('picked');
    click(option(3));
    click(main());
    expect(status().textContent).toBe(
      'Not quite. Each one you picked is true, but not every true one is picked yet. Pick again.',
    );
  });
});

describe('the review’s one-press extra choice', () => {
  it('answers at once, and says something even when the reply has no key', async () => {
    const send = vi.fn(async () => ({ right: false }));
    draw({
      question: checkQuestion,
      send,
      place: { verdict: true, extra: 'I don’t remember', extraAnswers: true, labels: { check: 'Check', done: 'Next' } },
      extraAnswers: true,
    });
    await act(async () => press('0'));
    expect(send).toHaveBeenCalledWith({ picked: null, extra: true, language: 'python' });
    expect(status().textContent).toBe('Noted. You will see this one again.');
  });

  it('answers it with Enter on the focused choice, with or without a pick made before', async () => {
    const place: AnswerPartPlace = {
      verdict: true,
      extra: 'I don’t remember',
      extraAnswers: true,
      labels: { check: 'Check', done: 'Next' },
    };
    for (const before of [null, 0]) {
      const send = vi.fn(async () => ({ right: false }));
      act(() => root.unmount());
      root = createRoot(host);
      draw({ question: checkQuestion, send, place, extraAnswers: true });
      if (before !== null) click(option(before));
      const event = await enterOn(host.querySelector<HTMLButtonElement>('button[data-option="extra"]')!);
      expect(event.defaultPrevented).toBe(false);
      expect(send).toHaveBeenCalledOnce();
      expect(send).toHaveBeenCalledWith({ picked: null, extra: true, language: 'python' });
    }
  });
});

describe('a card that goes away while sending', () => {
  it('goes nowhere when the reply comes late', async () => {
    let reply: (value: { right: boolean }) => void = () => {};
    const send = vi.fn(() => new Promise<{ right: boolean }>((resolve) => (reply = resolve)));
    const onDone = vi.fn();
    draw({ question: checkQuestion, send, onDone, place: CHECK });
    click(option(1));
    click(main());
    act(() => root.render(<div />));
    await act(async () => reply({ right: true }));
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('the line under the card', () => {
  function Under(props: { below?: ReactNode; keyLineEnd?: ReactNode }) {
    const answer = useLearnAnswer({ question: pickOneQuestion, language: 'python', verdict: true, onDone: () => {} });
    return <AnswerPart question={pickOneQuestion} answer={answer} place={LESSON} hints {...props} />;
  }
  const keyLine = () => host.querySelector('[data-key-line]');

  it('draws the line of keys where the place gives no line of its own', () => {
    act(() => root.render(<Under />));
    expect(keyLine()?.textContent).toContain('pick');
  });

  it('draws the line of keys with the place’s end beside it', () => {
    act(() => root.render(<Under keyLineEnd={<span data-end="">Stop and see the result</span>} />));
    expect(keyLine()).not.toBeNull();
    expect(keyLine()?.parentElement?.querySelector('[data-end]')?.textContent).toBe('Stop and see the result');
  });

  it('keeps the label inside the main button, cut with an ellipsis when long, and the key whole beside it', () => {
    act(() => root.render(<Under />));
    const main = host.querySelector<HTMLElement>('[data-answer-main]')!;
    const label = main.querySelector<HTMLElement>('[data-answer-label]')!;
    expect(label.textContent).toBe('Check');
    expect(label.className.split(' ')).toEqual(expect.arrayContaining(['min-w-0', 'truncate']));
    expect(main.querySelector('kbd')?.className.split(' ')).toContain('shrink-0');
    // At least 44px tall on a phone.
    expect(main.className.split(' ')).toContain('max-sm:min-h-11');
  });

  it('draws the place’s own line in place of the keys, even an empty one', () => {
    act(() => root.render(<Under below={<p data-below="">Learned.</p>} />));
    expect(keyLine()).toBeNull();
    expect(host.querySelector('[data-below]')?.textContent).toBe('Learned.');
    act(() => root.render(<Under below={null} />));
    expect(keyLine()).toBeNull();
  });
});
