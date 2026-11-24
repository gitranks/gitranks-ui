// @vitest-environment jsdom
import type { Route } from 'next';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, push, refresh, finishWalkthroughAction, shareAnswersAction, run } = vi.hoisted(() => ({
  hint: { present: false },
  push: vi.fn(),
  refresh: vi.fn(),
  finishWalkthroughAction: vi.fn(),
  shareAnswersAction: vi.fn(),
  run: {
    startLessonRun: vi.fn(),
    answerWarmup: vi.fn(),
    markStepShown: vi.fn(async () => ({ ok: true, data: true })),
    answerLessonQuestion: vi.fn(),
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
vi.mock('@/lib/learn/walkthrough.actions', () => ({ finishWalkthroughAction, shareAnswersAction }));
vi.mock('@/lib/learn/actions', () => run);
vi.mock('@/lib/learn/built-pages', () => ({
  LEARN_ISSUES_PAGE_BUILT: true,
  LEARN_PROJECT_COURSE_PAGE_BUILT: false,
  LEARN_FIXES_PAGE_BUILT: false,
  LEARN_APPROVE_PAGE_BUILT: false,
  LEARN_ANSWERS_SHARE_SWITCH_ON: true,
}));

const { PublicWalkthroughPlayer } = await import('./walkthrough-player');
const { FixerWalkthroughPlayer } = await import('./fixer-walkthrough');
const { AnswersLive } = await import('./answers-view');
const { AboutThisFix, factsOf, WalkthroughHead, WalkthroughPartArticle, walkthroughCrumbsOf } = await import(
  './walkthrough-parts'
);
const fx = await import('@/lib/learn/__fixtures__/walkthrough');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  for (const mock of [push, refresh, finishWalkthroughAction, shareAnswersAction, ...Object.values(run)]) {
    mock.mockReset();
  }
  run.markStepShown.mockResolvedValue({ ok: true, data: true });
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

const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const main = () => $('[data-answer-main]') as HTMLButtonElement;
const option = (index: number) => $(`[data-option="${index}"] input`) as HTMLInputElement;
const click = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });
const shownPart = () =>
  [...host.querySelectorAll<HTMLElement>('[data-walkthrough-parts] > div')].findIndex((part) => !part.hidden);
const text = () => host.textContent ?? '';

const articles = fx.walkthrough.parts.map((part, index) => (
  <WalkthroughPartArticle key={part.id} heading={part.heading} blocks={part.blocks} index={index} count={4} />
));

const drawPublic = () =>
  act(async () => {
    root.render(
      <PublicWalkthroughPlayer
        pr={fx.WALKTHROUGH_PR}
        version={3}
        crumbs={walkthroughCrumbsOf(fx.walkthrough)}
        head={<WalkthroughHead facts={factsOf(fx.walkthrough)} />}
        articles={articles}
        questions={fx.walkthroughQuestions}
        about={<AboutThisFix walkthrough={fx.walkthrough} />}
        next={'/learn/lessons/validate-input/real-world' as Route}
      />,
    );
  });

/** The right option of a fixture question, by its index. */
const RIGHT = [1, 1, null, 0];

async function answerRight(at: number) {
  if (at === 2) {
    await click(option(0));
    await click(option(1));
  } else await click(option(RIGHT[at] as number));
  await click(main());
}

describe('the public walkthrough', () => {
  it('has every part in the page, only the one asked about shown, and the facts over it', async () => {
    await drawPublic();
    expect(host.querySelectorAll('[data-walkthrough-part]')).toHaveLength(4);
    expect(shownPart()).toBe(0);
    expect($('h1')?.textContent).toBe('Saving a widget with an empty name breaks the list');
    expect(text()).toContain('fixed by octocat');
    expect(text()).toContain('Question 1 of 4');
    expect(text()).toContain('The lesson it used: Check input at the edge');
    // The fix's own page is not built yet: no button to it.
    expect(text()).not.toContain('The change and similar issues');
    expect(text()).not.toMatch(/\bstory\b|\blesson:/i);
  });

  it('shows why a pick is wrong and lets the person pick again, never counting it', async () => {
    await drawPublic();
    await click(option(0));
    await click(main());
    expect($('[data-option="0"]')?.dataset.optionMark).toBe('wrong');
    expect(text()).toContain('The list page did not change in this fix.');
    expect(shownPart()).toBe(0);
    await answerRight(0);
    expect(text()).toContain('1 of 4 answered.');
    expect(text()).toContain('A wrong pick never counts against you.');
    expect($('[data-player-squares] [data-square="right"]')).not.toBeNull();
    await click(main());
    expect(shownPart()).toBe(1);
  });

  it('finishes a visitor on the issues like this one, storing nothing', async () => {
    await drawPublic();
    for (const at of [0, 1, 2, 3]) {
      await answerRight(at);
      if (at < 3) await click(main());
    }
    expect(text()).toContain('All 4 answered.');
    expect(main().textContent).toContain('Finish the walkthrough');
    await click(main());
    expect(finishWalkthroughAction).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/learn/lessons/validate-input/real-world');
  });

  it("stores a signed-in person's pass and leads them to the first similar issue of their list", async () => {
    hint.present = true;
    finishWalkthroughAction.mockResolvedValue({ next: '/learn/issues/m1' });
    await drawPublic();
    for (const at of [0, 1, 2, 3]) {
      await answerRight(at);
      await click(main());
    }
    expect(finishWalkthroughAction).toHaveBeenCalledWith(fx.WALKTHROUGH_PR, 3);
    expect(push).toHaveBeenCalledWith('/learn/issues/m1');
  });
});

const PR_PAGE = '/my/pull-requests/acme/widgets/42' as Route;
const drawFixer = (start: typeof fx.fixerRun | null, finish: Route = PR_PAGE) =>
  act(async () => {
    root.render(
      <FixerWalkthroughPlayer
        attemptId="A_1"
        crumbs={[{ label: 'The walkthrough of this fix' }]}
        head={<WalkthroughHead facts={{ ...factsOf(fx.walkthrough), number: null, fixer: null }} />}
        stepIds={fx.fixerSteps.map((step) => step.id)}
        articles={articles}
        run={start}
        finish={finish}
        pullRequest={PR_PAGE}
      />,
    );
  });

const passed = { ...fx.fixerRun, current: null, passedAt: '2026-11-20T10:20:00.000Z' };

describe("the fixer's own walkthrough", () => {
  it('opens a run, answering a version 2 warm-up for the person without showing it', async () => {
    const warm = { ...fx.fixerRun, warmup: [{ ...fx.fixerRun.current!.question, id: 'w1', role: 'WARMUP' as const }] };
    run.startLessonRun.mockResolvedValue({ ok: true, data: warm });
    run.answerWarmup.mockResolvedValue({ ok: true, data: fx.fixerRun });
    await drawFixer(null);
    expect(run.startLessonRun).toHaveBeenCalledWith('A_1');
    expect(run.answerWarmup).toHaveBeenCalledWith('RUN_W', [{ questionId: 'w1', picked: [], dontKnow: true }]);
    expect(shownPart()).toBe(1);
    expect(run.markStepShown).toHaveBeenCalledWith('RUN_W', 'fix');
    expect(text()).toContain('Only you can see this walkthrough now.');
  });

  it('sends each pick; a wrong one shows why and stays, a right one waits for the person to go on', async () => {
    await drawFixer(fx.fixerRun);
    run.answerLessonQuestion.mockResolvedValueOnce({
      ok: true,
      data: { correct: false, why: [{ optionId: 'a', correct: false, why: 'Trim first.' }], run: fx.fixerRun },
    });
    await click(option(0));
    await click(main());
    expect(run.answerLessonQuestion).toHaveBeenCalledWith('RUN_W', 'q-fix', ['a']);
    expect($('[data-option="0"]')?.dataset.optionMark).toBe('wrong');
    expect(text()).toContain('Trim first.');

    const after = {
      ...fx.fixerRun,
      steps: fx.fixerRun.steps.map((step, index) => (index < 2 ? { ...step, state: 'FIRST_TRY' as const } : step)),
      current: {
        question: { ...fx.fixerRun.current!.question, id: 'q-cases', stepId: 'cases' },
        label: 'Question',
        hint: [],
      },
    };
    run.answerLessonQuestion.mockResolvedValueOnce({
      ok: true,
      data: { correct: true, why: [{ optionId: 'b', correct: true, why: 'Nothing is left.' }], run: after },
    });
    await click(option(1));
    await click(main());
    // The right answer stays on screen with its reason until Next.
    expect(shownPart()).toBe(1);
    expect(text()).toContain('Nothing is left.');
    expect(text()).toContain('2 of 4 answered.');
    await click(main());
    expect(shownPart()).toBe(2);
  });

  it("takes a version 2 run's other question after a wrong pick, with the reason over it", async () => {
    await drawFixer(fx.fixerRun);
    run.answerLessonQuestion.mockResolvedValueOnce({
      ok: true,
      data: { correct: false, why: [{ optionId: 'a', correct: false, why: 'Trim first.' }], run: fx.fixerRunAskAgain },
    });
    await click(option(0));
    await click(main());
    expect($('[data-walkthrough-hint]')?.textContent).toContain('Not quite.');
    expect($('[data-walkthrough-hint]')?.textContent).toContain('Try this one.');
    expect(text()).toContain('Which line refuses the empty name?');

    // A wrong pick on that question too: its own reason alone, the run's earlier one gone.
    run.answerLessonQuestion.mockResolvedValueOnce({
      ok: true,
      data: {
        correct: false,
        why: [{ optionId: 'a', correct: false, why: 'Look at the throw.' }],
        run: fx.fixerRunAskAgain,
      },
    });
    await click(option(0));
    await click(main());
    expect($('[data-walkthrough-hint]')).toBeNull();
    expect(text()).toContain('Look at the throw.');
    expect(text()).not.toContain('Trim first.');
  });

  it('leads the last right answer to the pull request, "Finish the walkthrough"', async () => {
    const last = {
      ...fx.fixerRun,
      steps: fx.fixerRun.steps.map((step, index) => (index < 3 ? { ...step, state: 'FIRST_TRY' as const } : step)),
      current: {
        question: { ...fx.fixerRun.current!.question, id: 'q-connects', stepId: 'connects' },
        label: 'Question',
        hint: [],
      },
    };
    await drawFixer(last);
    run.answerLessonQuestion.mockResolvedValueOnce({
      ok: true,
      data: {
        correct: true,
        why: [],
        run: { ...passed, steps: last.steps.map((step) => ({ ...step, state: 'FIRST_TRY' as const })) },
      },
    });
    await click(option(0));
    await click(main());
    expect(text()).toContain('All 4 answered.');
    expect(text()).toContain('Next: read the change and open the pull request.');
    expect(main().textContent).toContain('Finish the walkthrough');
    await click(main());
    expect(push).toHaveBeenCalledWith('/my/pull-requests/acme/widgets/42');
  });

  it('says a passed run is finished, and a blocked one goes back to the agent', async () => {
    await drawFixer(passed);
    expect($('[data-attempt-status="LEARN_WALKTHROUGH_DONE"]')).not.toBeNull();
    act(() => root.unmount());
    root = createRoot(host);
    // Once Approve exists, "Finish the walkthrough" leads there; a blocked walkthrough still goes to the pull request.
    await drawFixer({ ...fx.fixerRun, current: null, blocked: true }, `${PR_PAGE}/approve` as Route);
    expect(text()).toContain('Send it back to your agent');
    const link = [...host.querySelectorAll('a')].find((a) => a.textContent === 'Open your pull request');
    expect(link?.getAttribute('href')).toBe(PR_PAGE);
  });
});

const drawAnswers = (initial: typeof fx.octocatAnswers | null) =>
  act(async () => {
    root.render(<AnswersLive pr={fx.WALKTHROUGH_PR} login="octocat" initial={initial} />);
  });
const mineReply = (mine: unknown, answers: unknown = null) =>
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ mine, answers })));

describe("a person's answers", () => {
  it('shows every question answered, the right one marked, and only the number of tries', async () => {
    await drawAnswers(fx.octocatAnswers);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.querySelectorAll('[data-answered-question]')).toHaveLength(4);
    expect(host.querySelectorAll('[data-walkthrough-part]')).toHaveLength(4);
    expect(text()).toContain('How octocat answered');
    expect(text()).toContain(
      'octocat answered these 4 questions on 20 Nov 2026, before the pull request opened: 3 on the first try, 1 on the second.',
    );
    expect(text()).toContain('octocat picked it on the second try.');
    expect(text()).toContain('4 of 4 answered');
    expect($('[data-try-first]')).toBeNull();
  });

  it('offers a signed-in reader who has not answered to try the questions first', async () => {
    hint.present = true;
    mineReply(fx.readerMine);
    await drawAnswers(fx.octocatAnswers);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/fixes/acme/widgets/57?answers=octocat', {
      cache: 'no-store',
    });
    expect($('[data-try-first]')?.textContent).toContain('The answers are on this page');
  });

  it('says the answers are kept private, and shows the fixer their own with the switch', async () => {
    await drawAnswers(fx.answersKeptPrivate);
    expect($('h1')?.textContent).toBe('octocat keeps their answers private');
    expect($('[data-answered-question]')).toBeNull();

    hint.present = true;
    mineReply(fx.fixerMine, fx.octocatAnswersPrivate);
    act(() => root.unmount());
    root = createRoot(host);
    await drawAnswers(fx.answersKeptPrivate);
    expect(text()).toContain('Only you can see your answers now.');
    expect(text()).toContain('You picked it on the first try.');
    shareAnswersAction.mockResolvedValue({ ok: true, data: fx.octocatAnswers });
    await click($('[data-share-switch="share"]')!);
    expect(shareAnswersAction).toHaveBeenCalledWith(fx.WALKTHROUGH_PR, true);
    expect(text()).toContain('Your answers, as others see them');
    expect($('[data-share-switch="stop"]')).not.toBeNull();
  });

  it('says the answers are not here when the read did not come', async () => {
    await drawAnswers(null);
    expect($('h1')?.textContent).toBe('These answers are not here right now');
  });
});
