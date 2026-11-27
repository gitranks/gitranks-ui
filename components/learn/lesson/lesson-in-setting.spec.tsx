// @vitest-environment jsdom

import type { Route } from 'next';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LessonSetting } from '@/lib/workspace/lesson-setting';

const { push, answerLearnLessonAction } = vi.hoisted(() => ({
  push: vi.fn(),
  answerLearnLessonAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/lib/learn/lesson-page.actions', () => ({ answerLearnLessonAction, sendLearnFeedbackAction: vi.fn() }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => true }));
vi.mock('@/lib/learn/setup.actions', () => ({
  startLearnSetupGuessAction: vi.fn(async () => ({ ok: true as const, data: 'WORKING' as const })),
}));

const { LessonLive } = await import('./lesson-live');
const { LessonSettingContext } = await import('@/components/workspace/player/lesson-setting');
const { mineLearned, mineNew, setDepths, setGroup, setLesson } = await import('@/lib/learn/__fixtures__/lesson-page');
const { NO_LESSON_REAL } = await import('@/lib/learn/real-issues');
const { lessonRealIssues } = await import('@/lib/learn/__fixtures__/real-issues');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * A lesson opened in another setting than its course (an interview plan): the setting is the lesson page's to read,
 * made up here, so the page knows nothing of what fills it.
 */
const HELD = { lead: 'Learned.', tail: 'Not repeated: it is part of your interview plan.' };
const PLAN_HREF = '/interviews/northwind/senior-software-engineer' as Route;
const setting: LessonSetting = {
  crumbs: [
    { label: 'Interviews', href: '/interviews' },
    { label: 'Northwind · Senior software engineer', href: PLAN_HREF },
    { label: 'Sets' },
  ],
  plan: 'northwind/senior-software-engineer',
  here: `/learn/lessons/${setLesson.slug}?plan=northwind/senior-software-engineer` as Route,
  next: {
    label: 'Next: Sets, lesson 2',
    href: '/learn/lessons/sets-2?plan=northwind/senior-software-engineer' as Route,
  },
  lineOf: (held) => (held ? HELD : null),
  back: { label: 'Back to the plan', href: PLAN_HREF },
  held: false,
};

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

function routes(mine: unknown, real: unknown = NO_LESSON_REAL, learnOnboarded = true) {
  fetchMock.mockImplementation(async (path: string) => {
    const body = path.endsWith('/real-world')
      ? real
      : path.startsWith('/api/me/learn/lessons/')
        ? { mine, learnOnboarded }
        : {
            course: {
              slug: 'algorithms',
              lessons: Object.entries(setDepths).map(([slug, depth]) => ({ slug, depth })),
            },
          };
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  push.mockClear();
  answerLearnLessonAction.mockReset();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

/** The lesson's page with the state its setting provides: none, or the setting and when its read is over. */
async function draw(state: { setting: LessonSetting | null; settled: () => Promise<LessonSetting | null> } | null) {
  await act(async () => {
    root.render(
      <LessonSettingContext value={state}>
        <LessonLive
          lesson={setLesson}
          group={setGroup}
          fixes={null}
          article={<article data-lesson-article="">{setLesson.title}</article>}
          more={<footer data-more="" />}
        />
      </LessonSettingContext>,
    );
  });
}

const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const main = () => $('[data-answer-main]')!;
const crumbs = () =>
  [
    ...host.querySelectorAll('nav[aria-label="Breadcrumb"] a, nav[aria-label="Breadcrumb"] span:not([aria-hidden])'),
  ].map((node) => node.textContent);
const click = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });
const answerRight = async () => {
  await act(async () => {
    $('[data-option="1"] input')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    $('[data-option="1"] input')!.click();
  });
  await click(main());
};
const inSetting = (value: LessonSetting | null = setting) => ({ setting: value, settled: async () => value });

describe('a lesson opened in another setting', () => {
  it("names the setting on the strip in place of the course's way back", async () => {
    routes(mineNew);
    await draw(inSetting());
    expect(crumbs()).toEqual(['Interviews', 'Northwind · Senior software engineer', 'Sets']);
  });

  it('sends a right answer with the setting, and goes on where the setting leads', async () => {
    routes(mineNew);
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await draw(inSetting());
    await answerRight();
    expect(answerLearnLessonAction).toHaveBeenCalledWith(
      expect.objectContaining({ slug: setLesson.slug, plan: 'northwind/senior-software-engineer' }),
    );
    expect(main().textContent).toContain('Next: Sets, lesson 2');
    await click(main());
    expect(push).toHaveBeenCalledWith('/learn/lessons/sets-2?plan=northwind/senior-software-engineer');
  });

  it('sends the answer only once the read of the setting is over, and without it when the person is not in it', async () => {
    routes(mineNew);
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    let over: (value: LessonSetting | null) => void = () => {};
    const read = new Promise<LessonSetting | null>((resolve) => {
      over = resolve;
    });
    await draw({ setting: null, settled: () => read });
    await answerRight();
    expect(answerLearnLessonAction).not.toHaveBeenCalled();
    await act(async () => over(null));
    expect(answerLearnLessonAction).toHaveBeenCalledTimes(1);
    expect(answerLearnLessonAction.mock.calls[0][0]).not.toHaveProperty('plan');
  });

  it('says a held lesson is not repeated, with the way back to the setting on the right', async () => {
    routes(mineNew);
    answerLearnLessonAction.mockResolvedValue({
      ok: true,
      data: { right: true, mine: { ...mineLearned, held: true }, next: null },
    });
    await draw(inSetting());
    await answerRight();
    expect($('[data-depth-line]')).toBeNull();
    expect($('[data-setting-line]')!.textContent).toContain(
      'Learned. Not repeated: it is part of your interview plan.',
    );
    expect($('[data-setting-back]')!.getAttribute('href')).toBe('/interviews/northwind/senior-software-engineer');
  });

  it("keeps the lesson's own line when it is not held, with the way back in place of Fix a real issue", async () => {
    routes(mineNew, lessonRealIssues);
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await draw(inSetting());
    await answerRight();
    expect($('[data-setting-line]')).toBeNull();
    expect($('[data-depth-line]')).not.toBeNull();
    expect($('[data-fix-real-issue]')).toBeNull();
    expect($('[data-setting-back]')!.textContent).toBe('Back to the plan');
  });

  it('leads a person without the Learn sign through the setup back to the lesson in its setting', async () => {
    routes(mineNew, NO_LESSON_REAL, false);
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await draw(inSetting());
    await answerRight();
    expect(main().textContent).toContain('Keep your progress');
    await click(main());
    expect(push).toHaveBeenCalledWith(`/learn/setup?back=${encodeURIComponent(setting.here)}`);
  });

  // Every visitor, and every lesson opened outside a setting: no setting is provided at all.
  it.each([
    ['no setting is provided', null],
    ['the setting read finds none', inSetting(null)],
  ])('is the lesson as in its course when %s', async (_, state) => {
    routes(mineNew, lessonRealIssues);
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await draw(state);
    expect(crumbs()[0]).toBe('Learn');
    await answerRight();
    expect(answerLearnLessonAction).toHaveBeenCalledTimes(1);
    expect(answerLearnLessonAction.mock.calls[0][0]).not.toHaveProperty('plan');
    expect($('[data-setting-back]')).toBeNull();
    expect($('[data-fix-real-issue]')).not.toBeNull();
    await click(main());
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${setLesson.next!.slug}`);
  });
});
