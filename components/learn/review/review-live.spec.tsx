// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, push, signIn, answerLearnReviewAction } = vi.hoisted(() => ({
  hint: { present: false },
  push: vi.fn(),
  signIn: vi.fn(async () => undefined),
  answerLearnReviewAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-auth/react', () => ({ signIn }));
vi.mock('@/lib/learn/review.actions', () => ({ answerLearnReviewAction }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { ReviewLive, readReviewSide } = await import('./review-live');
const { algorithms, reviewItem, reviewNext, reviewReply, reviewSide, reviewSideEmpty, reviewSideMore } = await import(
  '@/lib/learn/__fixtures__/review'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const answer = (review: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ review }), { status }));

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  for (const mock of [push, signIn, answerLearnReviewAction]) mock.mockReset();
  signIn.mockResolvedValue(undefined);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  hint.present = false;
  vi.unstubAllGlobals();
});

const draw = (course: { slug: string; title: string } | null = null) =>
  act(async () => {
    root.render(<ReviewLive course={course} />);
  });
const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const state = () => $('[data-review-state]')?.dataset.reviewState ?? null;
const title = () => $('h1:not(.sr-only)')?.textContent ?? '';
const main = () => $('[data-answer-main]')!;
const option = (index: number) => $(`[data-option="${index}"] input`)!;
const extra = () => $('[data-option="extra"] input') ?? $('[data-option="extra"]')!;
const buttonOf = (text: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text);
const click = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });
const enter = () =>
  act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });

/** Answers the lesson on screen with a pick or "I don't remember": the call's reply shows. */
async function answerWith(reply: ReturnType<typeof reviewReply>, how: 'pick' | 'forgot' = 'pick') {
  answerLearnReviewAction.mockResolvedValueOnce({ ok: true, data: reply });
  // "I don't remember" answers in one press; a pick is checked with the main button.
  if (how === 'forgot') return click(extra());
  await click(option(reply.right ? 0 : 1));
  await click(main());
}

describe('the review, for a visitor', () => {
  it('asks for nothing and signs in back to the review, its title focused', async () => {
    await draw(algorithms);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state()).toBe('visitor');
    expect(title()).toBe('The review needs an account');
    expect(document.activeElement).toBe($('h1'));
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/review?course=algorithms' });
  });
});

describe('the review, for a person with a session', () => {
  beforeEach(() => {
    hint.present = true;
  });

  it('holds the card’s place while the set is on its way, and never asks to sign in', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await draw();
    expect(state()).toBe('pending');
    expect($('[aria-busy="true"] [role="status"]')!.textContent).toBe('Loading your review…');
    expect(buttonOf('Sign in with GitHub')).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/review', { cache: 'no-store' });
  });

  it('reads one course’s set when opened from a course, and names it in the strip', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await draw(algorithms);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/review?course=algorithms', { cache: 'no-store' });
    expect($('nav')?.textContent ?? host.textContent).toContain('Algorithms and data structures');
  });

  it('says a set that did not come did not load, and reads it again', async () => {
    answer(null);
    await draw();
    expect(state()).toBe('failed');
    expect(title()).toBe('Your review did not load');
    answer(reviewSideEmpty(new Date()));
    await click(buttonOf('Try again')!);
    expect(state()).toBe('empty');
  });

  it('says a failed read as one, for a status and for a network error alike', async () => {
    answer(reviewSide, 500);
    expect(await readReviewSide(null)).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readReviewSide(null)).toBeNull();
    answer({ items: 'no' });
    expect(await readReviewSide(null)).toBeNull();
  });

  it('with nothing due: when the next review is, and Enter goes to the next lesson', async () => {
    answer(reviewSideEmpty(new Date()));
    await draw();
    expect(state()).toBe('empty');
    expect(title()).toBe('Nothing is due today');
    expect(host.textContent).toContain('Your next review is in 2 days, with 3 lessons.');
    expect($('[data-review-primary]')!.textContent).toContain(`Next lesson: ${reviewNext.link.title}`);
    expect(host.textContent).not.toMatch(/\b0\b/);
    await enter();
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${reviewNext.link.slug}`);
  });

  it('with nothing learned yet and nothing next: no date, no zero, and the way home', async () => {
    answer({ ...reviewSideEmpty(new Date()), nextReviewAt: null, nextReviewLessons: 0, next: null });
    await draw();
    expect(host.textContent).toContain('A lesson you learn comes back here three days later, so it stays.');
    expect($('[data-review-primary]')!.textContent).toContain('Back to Learn home');
    expect(host.textContent).not.toMatch(/\b0\b/);
  });

  it('asks a lesson without its name, then names it and says what changed', async () => {
    answer(reviewSide);
    await draw();
    expect(host.textContent).toContain('A lesson from Algorithms and data structures');
    expect($('[data-review-lesson]')).toBeNull();
    expect(host.textContent).toContain('Lesson 1 of 6');
    await answerWith(reviewReply('PRACTISED'));
    expect(answerLearnReviewAction).toHaveBeenCalledWith({
      item: 'r1',
      picked: 0,
      forgot: false,
      language: 'python',
    });
    expect($('[data-review-lesson]')!.textContent).toContain('Hash sets: is it there?');
    const line = $('[data-review-change]')!;
    expect(line.dataset.reviewChange).toBe('PRACTISED');
    expect(line.getAttribute('role')).toBe('status');
    expect(line.textContent).toContain('Practised now. It was Learned. It comes back in 10 days.');
    expect(line.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Depth 2 of 3');
  });

  it('says Mastered at the top depth, and brings back a wrong pick and "I don\'t remember" tomorrow', async () => {
    answer(reviewSide);
    await draw();
    await answerWith(reviewReply('MASTERED'));
    expect($('[data-review-change]')!.textContent).toContain('Mastered now.');
    expect($('[data-review-change] [role="img"]')!.getAttribute('aria-label')).toBe('Depth 3 of 3');
    await click(main());

    await answerWith(reviewReply('BACK_TOMORROW'));
    expect($('[data-review-change]')!.textContent).toContain('It comes back tomorrow. A wrong pick only brings');
    expect($('[data-review-change] [role="img"]')).toBeNull();
    await click(main());

    await answerWith(reviewReply('BACK_TOMORROW', false), 'forgot');
    expect(answerLearnReviewAction).toHaveBeenLastCalledWith({
      item: 'r3',
      picked: null,
      forgot: true,
      language: 'python',
    });
    expect($('[data-review-change]')!.textContent).toContain('It comes back tomorrow. Nothing is lost');
  });

  it('moves the focus to each new lesson', async () => {
    answer(reviewSide);
    await draw();
    await answerWith(reviewReply('PRACTISED'));
    await click(main());
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Lesson 2 of 6');
  });

  it('keeps the card when an answer is not sent, and says so', async () => {
    answer(reviewSide);
    await draw();
    answerLearnReviewAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await click(option(0));
    await click(main());
    expect(host.textContent).toContain('Not sent.');
    expect($('[data-review-change]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads the set again when the answer came twice or too late', async () => {
    answer(reviewSide);
    await draw();
    answerLearnReviewAction.mockResolvedValueOnce({ ok: false, error: 'CONFLICT' });
    answer(reviewSideEmpty(new Date()));
    await click(option(0));
    await click(main());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(state()).toBe('empty');
  });

  it('ends with every lesson, what changed, "Finish the review" on the last, and Enter to the next lesson', async () => {
    answer({ ...reviewSide, items: [reviewItem('a'), reviewItem('b')] });
    await draw(algorithms);
    await answerWith(reviewReply('PRACTISED'));
    expect(main().textContent).toContain('Next lesson');
    await click(main());
    await answerWith(reviewReply('BACK_TOMORROW'));
    expect(main().textContent).toContain('Finish the review');
    await click(main());

    expect(state()).toBe('end');
    expect(title()).toBe('You repeated all 2 lessons');
    expect(document.activeElement).toBe($('[data-review-state="end"] h1'));
    expect(host.textContent).toContain('1 moved from Learned to Practised. 1 comes back tomorrow.');
    expect($('ul[aria-label="The lessons you repeated"]')!.querySelectorAll('li')).toHaveLength(2);
    expect(host.textContent).toContain('Right:');
    expect(host.textContent).toContain('Not this time:');
    expect(host.textContent).toContain('2 of 2 repeated');
    await enter();
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${reviewNext.link.slug}`);
  });

  it('says "your one lesson" for a set of one', async () => {
    answer({ ...reviewSide, items: [reviewItem('a')] });
    await draw();
    await answerWith(reviewReply('MASTERED'));
    await click(main());
    expect(title()).toBe('You repeated your one lesson');
    expect(host.textContent).toContain('1 moved from Practised to Mastered.');
  });

  it('with more due: how many wait, and "Repeat 10 more" reads the next set', async () => {
    answer({ ...reviewSideMore, items: reviewSideMore.items.slice(0, 1) });
    await draw();
    await answerWith(reviewReply('PRACTISED'));
    await click(main());
    expect(title()).toBe('You repeated 1 lesson');
    expect(host.textContent).toContain('That is today’s set. 14 more are due, and they wait for you.');
    expect(host.querySelector('[data-review-primary]')!.textContent).toContain('Repeat 10 more');
    answer(reviewSide);
    await enter();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('Lesson 1 of 6');
  });
});
