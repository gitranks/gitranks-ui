// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  signIn: vi.fn(async () => undefined),
  answer: vi.fn(async () => ({ ok: true, data: { learned: true } })),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next-auth/react', () => ({ signIn: m.signIn, useSession: () => ({ data: null }) }));
vi.mock('@/lib/learn/lesson-page.actions', () => ({ answerLearnLessonAction: m.answer }));
vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn(), readMoreLearnFixes: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

const { LearnLandingView } = await import('./learn-landing-view');
const { TRY_DONE_LABELS, TryLessonCard } = await import('./try-lesson');
const { courseCards } = await import('@/lib/learn/__fixtures__/course');
const { launchCourses, tryLessons } = await import('@/lib/learn/__fixtures__/learn-home-page');
const { setAnswerRight, setAnswerWrong } = await import('@/lib/learn/__fixtures__/lesson-page');
const { LANDING_QUESTIONS, LANDING_TITLE, landingTextOf } = await import('@/lib/learn/landing');
const { learnFixes } = await import('@/lib/learn/__fixtures__/issues');
const { landingFixes } = await import('@/lib/learn/__fixtures__/real-issues');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_DASH = String.fromCodePoint(0x2014);
type Props = Parameters<typeof LearnLandingView>[0];

function draw(props: Partial<Props> = {}) {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(
    <LearnLandingView viewer="visitor" courses={courseCards} lessons={tryLessons} hints {...props} />,
  );
  return page;
}

const words = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
/** The page's own section headings, the lesson card's question left out. */
const headings = (page: Element) =>
  [...page.querySelectorAll('h2')].filter((h2) => !h2.closest('[data-try-lesson]')).map((h2) => words(h2));

describe('Real issues fixed with Learn, on the landing', () => {
  const section = (page: Element) => page.querySelector('[data-landing-fixes]');

  it('names the three newest merged fixes, how many there are, and links all of them on Issues', () => {
    const page = draw({ fixes: landingFixes });
    const fixes = section(page)!;
    expect(words(fixes.querySelector('h2'))).toBe('Real issues fixed with Learn');
    expect(words(fixes)).toContain('12 merged so far, each in the name of the person who learned from it.');
    expect(fixes.querySelectorAll('li')).toHaveLength(3);
    expect(fixes.querySelector('a[href="/learn/issues?fixed=1"]')).not.toBeNull();
    // Each fix is a card that opens its own page, "Learn from it", with the lesson it used.
    expect(fixes.querySelectorAll('a[href^="/learn/fixes/"]')).toHaveLength(3);
    expect(words(fixes)).toContain('Used: Find duplicates in one pass with a set');
    expect(fixes.innerHTML).not.toContain(LONG_DASH);
  });

  it('says how many only from five', () => {
    const fixes = section(draw({ fixes: { ...landingFixes, total: 3 } }))!;
    expect(words(fixes)).toContain('Each in the name of the person who learned from it.');
    expect(words(fixes)).not.toContain('merged so far');
  });

  it('is left out with fewer than three, or when they cannot be read: the page as before', () => {
    const before = draw().innerHTML;
    expect(section(draw({ fixes: learnFixes }))).toBeNull();
    expect(draw({ fixes: null }).innerHTML).toBe(before);
  });
});

describe('the landing for a visitor', () => {
  const page = draw();

  it('opens with what Learn is, the start button and its line, and a real lesson to answer', () => {
    expect(page.querySelector('[data-landing-viewer="visitor"]')).not.toBeNull();
    expect(words(page.querySelector('h1'))).toBe(LANDING_TITLE);
    // The title on one side, its text and the start button on the other, over the lesson.
    const beside = page.querySelector('h1')?.parentElement?.nextElementSibling ?? null;
    expect(words(beside?.querySelector('p') ?? null)).toBe(landingTextOf(courseCards));
    expect(beside?.textContent).toContain('Start learning');
    expect(beside?.textContent).toContain('Free. You sign in with GitHub.');
    const card = page.querySelector('[data-try-lesson="visitor"]');
    expect(words(card)).toContain('Lesson 1 of 2');
    expect(card?.querySelector('[data-try-another]')).not.toBeNull();
    expect(words(card)).toContain(tryLessons[0].lesson.title);
    expect(words(card)).toContain('Python here. Every example also comes in');
  });

  it('has its sections in order, the courses by kind, and the questions', () => {
    expect(headings(page)).toEqual(['How it works', 'Courses', 'What you get', 'Honest with maintainers', 'Questions']);
    expect(page.querySelectorAll('[data-course-column]').length).toBeGreaterThan(0);
    for (const each of LANDING_QUESTIONS) expect(page.textContent).toContain(each.question);
  });

  it('ends with its Markdown copy and llms.txt, and has no long dash', () => {
    const links = [...page.querySelectorAll('footer a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/learn.md', '/llms.txt']);
    expect(page.textContent).not.toContain(LONG_DASH);
  });

  it('goes from its title to the lesson card, the card titled at the next level, before How it works', () => {
    const levels = [...page.querySelectorAll('h1, h2, h3')].map((heading) => Number(heading.tagName[1]));
    expect(levels.slice(0, 2)).toEqual([1, 2]);
    expect(levels.indexOf(3)).toBeGreaterThan(levels.indexOf(2));
    expect(words(page.querySelector('[data-try-lesson] h2'))).toBe(tryLessons[0].lesson.title);
  });

  it('gives its text links a 44px target on a phone', () => {
    const links = [
      ...page.querySelectorAll('footer a'),
      ...page.querySelectorAll('[data-try-lesson] a'),
      page.querySelector('a[href="/contribute/maintainers#learn"]'),
      page.querySelector('section a[href="/learn/courses"]'),
    ];
    for (const link of links) expect(link?.className, link?.textContent ?? '').toContain('max-sm:min-h-11');
  });

  it("quotes the pull request's footer as it is written now, its second line in two sentences", () => {
    expect(words(page)).toContain('Something off? Tell us or opt out in one step. Maintainers are always in control.');
    expect(words(page)).not.toContain('in one step - maintainers');
  });

  it('shows a course without numbers on launch day by its lessons alone', () => {
    const launch = draw({ courses: launchCourses });
    expect(launch.textContent).not.toMatch(/learners|\b0 /);
  });

  it('leaves out the lesson card and the courses when there are none, and still offers to start', () => {
    const empty = draw({ courses: [], lessons: [] });
    expect(empty.querySelector('[data-try-lesson]')).toBeNull();
    expect(headings(empty)).not.toContain('Courses');
    expect(empty.textContent).toContain('Start learning');
  });

  it('has no "Another lesson" with one lesson', () => {
    expect(draw({ lessons: tryLessons.slice(0, 1) }).querySelector('[data-try-another]')).toBeNull();
  });
});

describe('the landing for someone signed in', () => {
  it('sends someone not set up to the setup', () => {
    const page = draw({ viewer: 'member' });
    const starts = [...page.querySelectorAll('[data-landing-start]')];
    expect(starts.map((a) => [words(a), a.getAttribute('href')])).toEqual([
      ['Start learning', '/learn/setup'],
      ['Start learning', '/learn/setup'],
    ]);
    expect(page.textContent).toContain('Free. Setting up takes a minute.');
  });

  it('is How Learn works for a learner, both buttons back to Learn home, with no line under the top one', () => {
    const page = draw({ viewer: 'learner' });
    const starts = [...page.querySelectorAll('[data-landing-start]')];
    expect(starts.map((a) => [words(a), a.getAttribute('href')])).toEqual([
      ['Go to Learn home', '/learn'],
      ['Go to Learn home', '/learn'],
    ]);
    expect(page.textContent).not.toContain('Free.');
  });
});

describe('the lesson at the top, answered', () => {
  it('ends on Start learning for a visitor and for someone without the sign, Go to Learn home for a learner', () => {
    expect(TRY_DONE_LABELS).toEqual({
      visitor: 'Start learning',
      member: 'Start learning',
      learner: 'Go to Learn home',
    });
  });

  const below = (page: Element) => words(page.querySelector('[data-try-line]'));

  it('gives the reason after a wrong pick, and no line under it', () => {
    const page = draw({ tryDrawn: { answer: setAnswerWrong } });
    expect(page.querySelector('[data-try-line]')).toBeNull();
  });

  it('says a visitor answer is not saved, and asks them to sign in', () => {
    const page = draw({ tryDrawn: { answer: setAnswerRight } });
    expect(below(page)).toBe('Your answer is not saved without an account.');
    expect(page.textContent).toContain(TRY_DONE_LABELS.visitor);
  });

  it('says a signed-in answer is saved, then asks to set up Learn', () => {
    const page = draw({ viewer: 'member', tryDrawn: { answer: setAnswerRight, saved: true } });
    expect(below(page)).toBe('Learned. Saved to your account.');
    expect(page.textContent).toContain(TRY_DONE_LABELS.member);
  });

  it('says when a learner learned the lesson before, and leads back to Learn home', () => {
    const page = draw({ viewer: 'learner', tryDrawn: { answer: setAnswerRight, learnedOn: '14 Oct' } });
    expect(below(page)).toBe('Learned on 14 Oct.');
    expect(page.textContent).toContain('You answered this');
    expect(page.textContent).toContain(TRY_DONE_LABELS.learner);
  });
});

describe('the lesson card, used', () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ mine: null }), { status: 200 })),
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    for (const mock of Object.values(m)) mock.mockClear();
  });

  const doneButton = (label: string) =>
    [...host.querySelectorAll('button, a')].find((each) => words(each).startsWith(label)) as HTMLElement | undefined;

  it('moves to another lesson, and back to the first after the last', async () => {
    await act(async () => root.render(<TryLessonCard lessons={tryLessons} viewer="visitor" hints={false} />));
    const another = host.querySelector('[data-try-another]') as HTMLButtonElement;
    await act(async () => another.click());
    expect(words(host)).toContain('Lesson 2 of 2');
    expect(words(host)).toContain(tryLessons[1].lesson.title);
    await act(async () => another.click());
    expect(words(host)).toContain('Lesson 1 of 2');
  });

  it("signs a visitor in from the landing's Start learning through the onboarding, ending on Learn home", async () => {
    await act(async () =>
      root.render(<LearnLandingView viewer="visitor" courses={courseCards} lessons={tryLessons} hints={false} />),
    );
    const start = host.querySelector('[data-sign-in="learn"]') as HTMLButtonElement;
    expect(words(start)).toBe('Start learning');
    await act(async () => start.click());
    expect(m.signIn).toHaveBeenCalledWith(expect.any(String), { redirectTo: '/learn/setup?back=%2Flearn' });
  });

  it('signs a visitor in on to the setup once the answer is right', async () => {
    await act(async () =>
      root.render(
        <TryLessonCard lessons={tryLessons} viewer="visitor" drawn={{ answer: setAnswerRight }} hints={false} />,
      ),
    );
    await act(async () => doneButton(TRY_DONE_LABELS.visitor)?.click());
    expect(m.signIn).toHaveBeenCalledWith(expect.any(String), { redirectTo: '/learn/setup?back=%2Flearn' });
    expect(m.push).not.toHaveBeenCalled();
  });

  it('takes someone not set up to the setup, and a learner back to Learn home', async () => {
    for (const [viewer, to] of [
      ['member', '/learn/setup'],
      ['learner', '/learn'],
    ] as const) {
      await act(async () =>
        root.render(
          <TryLessonCard
            key={viewer}
            lessons={tryLessons}
            viewer={viewer}
            drawn={{ answer: setAnswerRight, saved: true }}
            hints={false}
          />,
        ),
      );
      await act(async () => doneButton(TRY_DONE_LABELS[viewer])?.click());
      expect(m.push).toHaveBeenLastCalledWith(to);
    }
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("reads a learner's own side of the lesson, and only a learner's", async () => {
    await act(async () => root.render(<TryLessonCard lessons={tryLessons} viewer="member" hints={false} />));
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => root.render(<TryLessonCard key="l" lessons={tryLessons} viewer="learner" hints={false} />));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
