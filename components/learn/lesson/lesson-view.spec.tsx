// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMENT_NOT_SENT, RATING_NOT_SAVED } from './lesson-feedback';
import { LessonView, type LessonViewProps } from './lesson-view';
import {
  LESSON_NOW,
  loopDepths,
  loopExampleCodes,
  loopGroup,
  loopLesson,
  loopQuestionCodes,
  mineLearned,
  mineLearnedRated,
  mineLoopInJavaScript,
  mineMastered,
  mineNew,
  mythLesson,
  outputExampleCodes,
  outputGroup,
  outputLesson,
  outputQuestionCodes,
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
  const calls = {
    onNext: vi.fn(),
    onSignIn: vi.fn(),
    onRate: vi.fn(async (_good: boolean) => true),
    onComment: vi.fn(async (_comment: string, _good: boolean) => true),
    onGraded: vi.fn(),
  };
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
/** A click whose call answers later: the answer is awaited. */
const clickAndWait = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });
const button = (words: string) =>
  [...host.querySelectorAll<HTMLElement>('[data-comment-box] button')].find((b) => b.textContent === words)!;
const type = (field: HTMLTextAreaElement, value: string) =>
  act(() => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    setValue.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
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

  it('never counts zero: with nothing of the group learned, the squares and how many lessons, then the count', () => {
    draw({ viewer: { mine: mineNew, depths: {} } });
    expect($('[data-lesson-run]')!.textContent).toBe('9 lessons');
    expect(text()).not.toContain('0 of 9');
    expect(host.querySelectorAll('[data-square]')).toHaveLength(9);
    // The words keep one width, the widest's, so the change below moves and wraps nothing.
    const width = $('[data-lesson-count]')!.className;
    expect(width.split(' ')).toContain('min-w-[16ch]');
    click(option(1));
    press('Enter');
    expect($('[data-lesson-run]')!.textContent).toBe('1 of 9 learned');
    expect($('[data-lesson-count]')!.className).toBe(width);
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

  it('saves a rating, then offers a comment that can be sent or skipped, the focus back on the rating', async () => {
    const calls = draw({ viewer: member(mineLearned), drawn: { answer: setAnswerRight } });
    await clickAndWait($('[data-rate="not-good"]')!);
    expect(calls.onRate).toHaveBeenCalledWith(false);
    expect($('[data-rate="not-good"]')!.getAttribute('aria-pressed')).toBe('true');
    expect($('[data-comment-box]')!.textContent).toContain('Saved. Want to tell us more?');
    const field = $('[data-comment-box] textarea') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(field);
    // A number typed in the comment opens no row.
    press('2', field);
    expect(openRow()).toBe('say');
    type(field, '  The example could use Go first.  ');
    await clickAndWait(button('Send'));
    expect(calls.onComment).toHaveBeenCalledWith('The example could use Go first.', false);
    expect($('[data-comment-box]')).toBeNull();
    expect(document.activeElement).toBe($('[data-rate="not-good"]'));

    await clickAndWait($('[data-rate="good"]')!);
    expect(calls.onRate).toHaveBeenLastCalledWith(true);
    click(button('No, thanks'));
    expect($('[data-comment-box]')).toBeNull();
    expect(document.activeElement).toBe($('[data-rate="good"]'));
    expect(calls.onComment).toHaveBeenCalledOnce();
    // Enter on the rating presses the rating, not the main button.
    press('Enter', $('[data-rate="good"]')!);
    expect(calls.onNext).not.toHaveBeenCalled();
  });

  it('closes the comment box on Escape, a click outside it, or the focus leaving it', async () => {
    draw({ viewer: member(mineLearned), drawn: { answer: setAnswerRight } });
    await clickAndWait($('[data-rate="good"]')!);
    press('Escape', $('[data-comment-box] textarea')!);
    expect($('[data-comment-box]')).toBeNull();
    expect(document.activeElement).toBe($('[data-rate="good"]'));

    await clickAndWait($('[data-rate="good"]')!);
    act(() => {
      $('[data-lesson-article]')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect($('[data-comment-box]')).toBeNull();

    await clickAndWait($('[data-rate="good"]')!);
    // A press inside the box keeps it.
    act(() => {
      $('[data-comment-box] textarea')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect($('[data-comment-box]')).not.toBeNull();
    act(() => $('[data-insight="say"] button[aria-expanded]')!.focus());
    expect($('[data-comment-box]')).toBeNull();
  });

  it('shows a rating that was not saved, and puts back the one before', async () => {
    const calls = draw({ viewer: member(mineLearnedRated) });
    calls.onRate.mockResolvedValueOnce(false);
    await clickAndWait($('[data-rate="not-good"]')!);
    expect($('[data-rate="good"]')!.getAttribute('aria-pressed')).toBe('true');
    expect($('[data-rate="not-good"]')!.getAttribute('aria-pressed')).toBe('false');
    expect($('[data-comment-box]')).toBeNull();
    expect($('[data-feedback-error="rating"]')!.textContent).toBe(RATING_NOT_SAVED);
    calls.onRate.mockRejectedValueOnce(new Error('offline'));
    await clickAndWait($('[data-rate="not-good"]')!);
    expect($('[data-rate="good"]')!.getAttribute('aria-pressed')).toBe('true');
    await clickAndWait($('[data-rate="not-good"]')!);
    expect($('[data-feedback-error="rating"]')).toBeNull();
    expect($('[data-rate="not-good"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a comment that was not sent in the box, to send again', async () => {
    const calls = draw({ viewer: member(mineLearned), drawn: { answer: setAnswerRight } });
    await clickAndWait($('[data-rate="good"]')!);
    const field = $('[data-comment-box] textarea') as HTMLTextAreaElement;
    type(field, 'More pictures, please.');
    calls.onComment.mockRejectedValueOnce(new Error('offline'));
    await clickAndWait(button('Send'));
    expect($('[data-comment-box]')).not.toBeNull();
    expect(field.value).toBe('More pictures, please.');
    expect($('[data-feedback-error="comment"]')!.textContent).toBe(COMMENT_NOT_SENT);
    expect(document.activeElement).toBe(field);
    await clickAndWait(button('Send'));
    expect(calls.onComment).toHaveBeenCalledTimes(2);
    expect(calls.onComment).toHaveBeenLastCalledWith('More pictures, please.', true);
    expect($('[data-comment-box]')).toBeNull();
  });

  it('says the group is finished by whichever lesson finished it', () => {
    const others = Object.fromEntries(
      setGroup.filter((entry) => entry.slug !== setLesson.slug).map((entry) => [entry.slug, 'LEARNED' as const]),
    );
    draw({ viewer: { mine: mineNew, depths: others } });
    click(option(1));
    click(main());
    expect($('[data-depth-line]')!.textContent).toBe('Learned. Group finished.');
    expect($('[data-lesson-run]')!.textContent).toBe('9 of 9 learned');
    // Not the group's last lesson: the button goes on to the next one.
    expect(main().textContent).toBe('Next: Count things with a hash map');
  });

  it('asks again when the stored pick is no longer right: the strip keeps the depth, the rest waits for the answer', () => {
    draw({ viewer: member({ ...mineLearnedRated, picked: 0 }) });
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('open');
    expect($('[data-answer-part] .rounded-full')!.textContent).toBe('Pick one');
    expect($('[data-lesson-run]')!.textContent).toBe('3 of 9 learned');
    expect($('[data-insights="locked"]')).not.toBeNull();
    expect($('[data-depth-line]')).toBeNull();
    expect($('[data-lesson-feedback]')).toBeNull();
    click(option(1));
    click(main());
    expect($('[data-depth-line]')!.textContent).toBe('Learned. Review in 3 days.');
    expect($('[data-answer-part] .rounded-full')!.textContent).toBe('Pick one');
  });

  it('ends a myth-or-fact lesson answered wrong: done, nothing learned, the rows locked, no rating', () => {
    const calls = draw({ lesson: mythLesson, viewer: member() });
    click($('[data-myth="fact"]')!);
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('done');
    expect(calls.onGraded).toHaveBeenLastCalledWith({ picked: 'fact', right: false, tries: 1, language: 'python' });
    expect(main().textContent).toBe('Next: Count things with a hash map');
    expect($('[data-insights="locked"]')).not.toBeNull();
    expect($('[data-depth-line]')).toBeNull();
    expect($('[data-lesson-feedback]')).toBeNull();
    expect($('[data-lesson-run]')!.textContent).toBe('2 of 9 learned');
    click(main());
    expect(calls.onNext).toHaveBeenCalledOnce();
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

  it('opens on the fact a shared link points at, before any answer', () => {
    draw({ openFact: true });
    expect($('[data-insights="open"]')).not.toBeNull();
    expect(openRow()).toBe('fact');
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('open');
  });

  it('draws a lesson with no example as its text alone: no example box, no label, nothing after the text', () => {
    draw({ lesson: { ...setLesson, examples: [] }, examples: [] });
    expect($('[data-block="example"]')).toBeNull();
    expect(text()).not.toContain('Example');
    const article = $('[data-lesson-article]')!;
    expect(article.lastElementChild!.textContent).toContain('So you go through the list only once');
    expect([...article.children].every((child) => child.textContent!.trim() !== '')).toBe(true);
  });

  it("never draws a lesson's question code as its example", () => {
    draw({
      lesson: { ...setLesson, examples: [{ ...setLesson.examples[0], name: 'q1' }] },
      examples: [{ name: 'q1', codes: setExampleCodes }],
    });
    expect($('[data-lesson-article] [data-block="example"]')).toBeNull();
  });

  it('starts a new answer for another lesson in the same place', () => {
    draw({ viewer: member(mineLearnedRated) });
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('done');
    draw({ lesson: mythLesson, viewer: member() });
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('open');
    expect($('[data-answer-part] .rounded-full')!.textContent).not.toBe('You answered this');
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

describe('a lesson whose question has code', () => {
  const loop = (mine = mineNew) =>
    draw({
      lesson: loopLesson,
      examples: [{ name: 'main', codes: loopExampleCodes }],
      questionCodes: loopQuestionCodes,
      group: loopGroup,
      viewer: { mine, depths: loopDepths },
    });
  const line = (number: number) => $(`[data-line="${number}"]`)!;

  it('draws the lines to click, and grades the line clicked', () => {
    const calls = loop();
    expect($('[data-question-code="line"]')!.textContent).toContain('Click a line');
    click(line(2));
    click(main());
    expect(line(2).getAttribute('data-line-mark')).toBe('wrong');
    click(line(3));
    click(main());
    expect(calls.onGraded).toHaveBeenLastCalledWith({ picked: 3, right: true, tries: 2, language: 'python' });
    expect(line(3).getAttribute('data-line-mark')).toBe('right');
    expect($('[data-depth-line]')!.textContent).toBe('Learned.');
  });

  it('shows a line given in JavaScript as answered, in JavaScript, though the page opens in Python', () => {
    loop(mineLoopInJavaScript);
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('done');
    expect($('[data-answer-part] .rounded-full')!.textContent).toBe('You answered this');
    expect($('[data-question-code="line"]')!.textContent).toContain('function hasDuplicate');
    expect(line(4).getAttribute('data-line-mark')).toBe('right');
    expect(host.querySelectorAll('[data-line-mark="right"]')).toHaveLength(1);
    expect($('[data-insights="open"]')).not.toBeNull();
  });

  it('draws the code to read, and what it prints once answered', () => {
    draw({
      lesson: outputLesson,
      examples: [{ name: 'main', codes: outputExampleCodes }],
      questionCodes: outputQuestionCodes,
      group: outputGroup,
      viewer: { mine: mineNew, depths: {} },
    });
    expect($('[data-question-code="output"]')!.textContent).toContain('Read this code');
    expect($('[data-question-code="output"]')!.textContent).toContain('print(stack.pop())');
    expect($('[data-question-output]')).toBeNull();
    click(option(1));
    click(main());
    expect($('[data-question-output]')!.textContent).toBe('Output3');
  });

  it('draws no code for a question that has none', () => {
    draw();
    expect($('[data-question-code]')).toBeNull();
  });
});

describe('the review’s words, drawn on the server and then in the browser', () => {
  const view = (props: Partial<LessonViewProps>) => (
    <LessonView
      lesson={setLesson}
      examples={[{ name: 'main', codes: setExampleCodes }]}
      group={setGroup}
      viewer={member(mineLearnedRated)}
      links={{ markdown: '/learn/lessons/find-duplicates-with-a-set.md', report: 'mailto:hello@gitranks.com' }}
      calls={{ onNext: vi.fn(), onSignIn: vi.fn(), onRate: vi.fn(), onComment: vi.fn() }}
      hints={false}
      {...props}
    />
  );

  async function hydrate(props: Partial<LessonViewProps>) {
    const html = renderToString(view(props));
    const server = document.createElement('div');
    server.innerHTML = html;
    act(() => root.unmount());
    host.innerHTML = html;
    const errors: unknown[] = [];
    const hydrated = await act(async () =>
      hydrateRoot(host, view(props), { onRecoverableError: (error) => errors.push(error) }),
    );
    root = hydrated;
    return { server: server.querySelector('[data-depth-line]')!.textContent, errors };
  }

  it('waits for the browser’s clock and zone when the page gives neither', async () => {
    const { server, errors } = await hydrate({});
    expect(server).toBe('Learned.');
    expect(errors).toEqual([]);
    expect($('[data-depth-line]')!.textContent).toMatch(/^Learned\. Review (today|tomorrow|in \d+ days)\.$/);
  });

  it('draws them on the server when the page gives its clock and zone', async () => {
    // Due at midnight UTC, which is the evening before in Los Angeles.
    const { server, errors } = await hydrate({ now: LESSON_NOW, timeZone: 'America/Los_Angeles' });
    expect(server).toBe('Learned. Review in 2 days.');
    expect(errors).toEqual([]);
    expect($('[data-depth-line]')!.textContent).toBe('Learned. Review in 2 days.');
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

  it('numbers a list that goes on after a placed example from where it left off', () => {
    draw({ lesson: { ...setLesson, body: '1. One\n2. Two\n\n[[example: main]]\n\n3. Three\n4. Four' } });
    const lists = [...$('[data-lesson-article]')!.querySelectorAll('ol')];
    expect(lists.map((list) => list.getAttribute('start'))).toEqual([null, '3']);
    expect(lists[1].start).toBe(3);
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

  it('leaves the Markdown link out of the footer while the page has no Markdown copy', () => {
    draw({ links: { report: 'mailto:hello@gitranks.com' } });
    expect($('[data-lesson-footer]')!.textContent).toBe(
      'Written and checked by GitRanks · last checked 21 Oct 2026 · Report a mistake',
    );
    const links = [...$('[data-lesson-footer]')!.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['mailto:hello@gitranks.com']);
  });
});
