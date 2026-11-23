// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonView, type LessonViewProps } from './lesson-view';
import {
  LESSON_NOW,
  mineLearned,
  mineLearnedRated,
  mineMastered,
  mineNew,
  regexDepths,
  regexExampleCodes,
  regexGroup,
  regexLesson,
  setAnswerRight,
  setDepths,
  setDepthsLast,
  setExampleCodes,
  setGroup,
  setGroupLast,
  setLesson,
  setLessonFull,
  setLessonLast,
  setLessonWithVisual,
} from '@/lib/learn/__fixtures__/lesson-page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function draw(props: Partial<LessonViewProps> = {}) {
  const calls = { onNext: vi.fn(), onSignIn: vi.fn(), onRate: vi.fn(), onComment: vi.fn(), onGraded: vi.fn() };
  act(() =>
    root.render(
      <LessonView
        lesson={setLesson}
        examples={[{ name: 'main', codes: setExampleCodes }]}
        group={setGroup}
        viewer={null}
        links={{ markdown: '/learn/lessons/find-duplicates-with-a-set.md', report: 'mailto:hello@gitranks.com' }}
        calls={calls}
        hints={false}
        now={LESSON_NOW}
        timeZone="UTC"
        {...props}
      />,
    ),
  );
  return calls;
}

const text = () => host.textContent ?? '';
const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const main = () => $('[data-answer-main]')!;
const option = (index: number) => $(`[data-option="${index}"] input`)!;
const click = (element: HTMLElement) => act(() => element.click());
const press = (key: string, on: HTMLElement = document.body) =>
  act(() => {
    on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
const openRow = () => $('[data-insight-open]')?.getAttribute('data-insight');
const member = (mine = mineNew) => ({ mine, depths: setDepths });

describe('a lesson for a visitor', () => {
  it('says where the lesson is, keeps the insights locked, and asks to sign in to save', () => {
    draw();
    expect($('[data-lesson-run]')!.textContent).toBe('Lesson 3 of 9');
    expect($('[data-depth-squares]')).toBeNull();
    expect($('[data-insights="locked"]')!.textContent).toContain('After you answer');
    expect($('[data-visitor-note]')!.textContent).toBe('Sign in with GitHub to save your progress.');
    expect(host.querySelector('h1')!.textContent).toBe('Find duplicates in one pass with a set');
    expect(host.querySelectorAll('h1')).toHaveLength(1);
  });

  it('keeps the insights’ text in the page, folded, before any answer', () => {
    draw();
    expect(text()).toContain('To find duplicates, I keep a set');
    expect(text()).toContain('In 2011, researchers showed');
  });

  it('crosses out a wrong pick and keeps the rows locked; a right one opens them, asks to sign in, saves nothing', () => {
    const calls = draw();
    click(option(0));
    click(main());
    expect($('[data-option="0"]')!.getAttribute('data-option-mark')).toBe('wrong');
    expect($('[role=status]')!.textContent).toContain('Not quite.');
    expect($('[data-insights="locked"]')).not.toBeNull();
    click(option(1));
    click(main());
    expect(calls.onGraded).toHaveBeenLastCalledWith({ picked: 1, right: true, tries: 2, language: 'python' });
    expect(main().textContent).toBe('Sign in with GitHub to continue');
    expect($('[data-visitor-line]')!.textContent).toBe('Your answer is not saved without an account.');
    expect($('[data-visitor-note]')).toBeNull();
    expect($('[data-insights="open"]')).not.toBeNull();
    expect($('[data-lesson-feedback]')).toBeNull();
    expect($('[data-depth-line]')).toBeNull();
    click(main());
    expect(calls.onSignIn).toHaveBeenCalledOnce();
    expect(calls.onNext).not.toHaveBeenCalled();
  });

  it('shows the insights without an answer, the question still open', () => {
    draw();
    click($('[data-insights-show]')!);
    expect($('[data-insights="open"]')).not.toBeNull();
    expect(openRow()).toBe('say');
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('open');
    // The number keys still pick an option, not a row.
    press('3');
    expect(openRow()).toBe('say');
    expect($('[data-option="2"]')!.getAttribute('data-option-mark')).toBe('picked');
  });
});

describe('a lesson for a member', () => {
  it('draws the group’s squares and how many are learned', () => {
    draw({ viewer: member() });
    expect($('[data-lesson-run]')!.textContent).toBe('2 of 9 learned');
    const squares = [...host.querySelectorAll('[data-square]')].map((square) => square.getAttribute('data-square'));
    expect(squares.slice(0, 4)).toEqual(['learned', 'learned', 'current', 'none']);
    expect($('[data-visitor-note]')).toBeNull();
  });

  it('turns a right answer into Learned at once: the square, the depth line, Next, the rows and the rating', () => {
    const calls = draw({ viewer: member() });
    click(option(1));
    press('Enter');
    expect($('[data-lesson-run]')!.textContent).toBe('3 of 9 learned');
    expect($('[data-depth-line]')!.textContent).toBe('Learned.');
    expect(main().textContent).toBe('Next: Count things with a hash map');
    expect(openRow()).toBe('say');
    expect($('[data-lesson-feedback]')).not.toBeNull();
    press('Enter');
    expect(calls.onNext).toHaveBeenCalledOnce();
  });

  it('says when the review comes once the saved depth arrives', () => {
    draw({ viewer: member(mineLearned), drawn: { answer: setAnswerRight } });
    expect($('[data-depth-line]')!.textContent).toBe('Learned. Review in 3 days.');
    expect($('[data-depth-line] [role=img]')!.getAttribute('aria-label')).toBe('Depth 1 of 3');
    expect($('[data-answer-part] .rounded-full')!.textContent).toBe('Pick one');
  });

  it('opens one row at a time, by a click or its number', () => {
    draw({ viewer: member(mineLearned), drawn: { answer: setAnswerRight } });
    press('3');
    expect(openRow()).toBe('deeper');
    press('3');
    expect(openRow()).toBeUndefined();
    click($('[data-insight="fact"] button[aria-expanded]')!);
    expect(openRow()).toBe('fact');
    expect($('[data-insight="fact"]')!.textContent).toContain('Source: 28C3 talk, 2011');
    expect($('[data-insight="fact"] a')!.getAttribute('href')).toContain('events.ccc.de');
    press('9');
    expect(openRow()).toBe('fact');
  });

  it('saves a rating at once, then offers a comment that can be sent or skipped', () => {
    const calls = draw({ viewer: member(mineLearned), drawn: { answer: setAnswerRight } });
    click($('[data-rate="not-good"]')!);
    expect(calls.onRate).toHaveBeenCalledWith(false);
    expect($('[data-rate="not-good"]')!.getAttribute('aria-pressed')).toBe('true');
    expect($('[data-comment-box]')!.textContent).toContain('Saved. Want to tell us more?');
    const field = $('[data-comment-box] textarea') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(field);
    // A number typed in the comment opens no row.
    press('2', field);
    expect(openRow()).toBe('say');
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setValue.call(field, '  The example could use Go first.  ');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click([...host.querySelectorAll<HTMLElement>('[data-comment-box] button')].find((b) => b.textContent === 'Send')!);
    expect(calls.onComment).toHaveBeenCalledWith('The example could use Go first.', false);
    expect($('[data-comment-box]')).toBeNull();

    click($('[data-rate="good"]')!);
    expect(calls.onRate).toHaveBeenLastCalledWith(true);
    click(
      [...host.querySelectorAll<HTMLElement>('[data-comment-box] button')].find((b) => b.textContent === 'No, thanks')!,
    );
    expect($('[data-comment-box]')).toBeNull();
    expect(calls.onComment).toHaveBeenCalledOnce();
  });

  it('shows a lesson opened again as answered, with its rating', () => {
    const calls = draw({ viewer: member(mineLearnedRated) });
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('done');
    expect($('[data-answer-part] .rounded-full')!.textContent).toBe('You answered this');
    expect($('[data-option="1"]')!.getAttribute('data-option-mark')).toBe('right');
    expect($('[data-rate="good"]')!.getAttribute('aria-pressed')).toBe('true');
    expect($('[data-depth-line]')!.textContent).toBe('Learned. Review in 3 days.');
    click(main());
    expect(calls.onNext).toHaveBeenCalledOnce();
    expect(calls.onGraded).not.toHaveBeenCalled();
  });

  it('finishes the group on its last lesson', () => {
    draw({
      lesson: setLessonLast,
      group: setGroupLast,
      viewer: { mine: mineNew, depths: setDepthsLast },
    });
    click(option(1));
    click(main());
    expect(main().textContent).toBe('Finish this group');
    expect($('[data-depth-line]')!.textContent).toBe('Learned. Group finished.');
    expect($('[data-lesson-run]')!.textContent).toBe('9 of 9 learned');
    expect($('[data-lesson-next]')!.textContent).toContain('Next group');
    expect($('[data-lesson-next]')!.textContent).toContain('Stacks and queues');
  });

  it('says a mastered lesson has nothing more to do', () => {
    draw({
      lesson: regexLesson,
      examples: [{ name: 'main', codes: regexExampleCodes }],
      group: regexGroup,
      viewer: { mine: mineMastered, depths: regexDepths },
    });
    expect($('[data-depth-line]')!.textContent).toBe('Mastered. Nothing more to do. This is the top level.');
    expect($('[data-lesson-run]')!.textContent).toBe('6 of 14 learned');
    expect(host.querySelectorAll('[data-square="mastered"]')).toHaveLength(1);
    expect(main().textContent).toBe('Next: Match the start and the end of a string');
  });
});

describe('the lesson’s text', () => {
  it('places the example where the text reaches it, in Markdown with no HTML', () => {
    draw({
      lesson: {
        ...setLessonFull,
        body: `${setLessonFull.body}\n\n<script>alert(1)</script>\n\nAnd a [link](https://example.com).`,
      },
    });
    const article = $('[data-lesson-article]')!;
    const blocks = [...article.children].map(
      (child) => child.tagName.toLowerCase() + (child.getAttribute('data-block') ?? ''),
    );
    expect(blocks).toEqual(['h1', 'div', 'figureexample', 'div']);
    expect(article.querySelector('b')!.textContent).toBe('The slow way.');
    expect(article.querySelector('i')!.textContent).toBe('square');
    expect(article.querySelector('script')).toBeNull();
    expect(article.querySelector('a')).toBeNull();
    expect(article.textContent).toContain('And a link.');
  });

  it('draws a visual the text places', () => {
    draw({ lesson: setLessonWithVisual });
    const kinds = [...$('[data-lesson-article]')!.querySelectorAll('[data-block]')].map((block) =>
      block.getAttribute('data-block'),
    );
    expect(kinds).toEqual(['table', 'example']);
  });

  it('links its neighbours and its footer', () => {
    draw();
    expect($('[data-lesson-previous]')!.getAttribute('href')).toBe('/learn/lessons/how-a-hash-map-finds-a-key');
    expect($('[data-lesson-previous]')!.textContent).toContain('Previous lesson');
    expect($('[data-lesson-next]')!.textContent).toContain('Next lesson');
    expect($('[data-lesson-footer]')!.textContent).toBe(
      'Written and checked by GitRanks · last checked 21 Oct 2026 · Markdown version · Report a mistake',
    );
    const links = [...$('[data-lesson-footer]')!.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/learn/lessons/find-duplicates-with-a-set.md', 'mailto:hello@gitranks.com']);
  });
});
