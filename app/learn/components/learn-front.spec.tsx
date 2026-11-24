import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  viewerLogin: vi.fn(async (): Promise<string | undefined> => undefined),
  loadLearnHome: vi.fn(async (): Promise<unknown> => null),
  loadLearnSetup: vi.fn(async (): Promise<unknown> => null),
  loadWorkspaceGate: vi.fn(async (): Promise<unknown> => null),
  loadLearnCourses: vi.fn(async (): Promise<unknown[]> => []),
  loadTryLessons: vi.fn(async (): Promise<unknown[]> => []),
  loadLearnProfile: vi.fn(async (): Promise<unknown> => null),
  loadLearnTimeZone: vi.fn(async (): Promise<unknown> => null),
  loadHomeReal: vi.fn(async (): Promise<unknown> => ({ box: null, fixes: [], issues: [] })),
  loadMergedFixes: vi.fn(async (): Promise<unknown> => null),
  loadMaskedListReads: vi.fn(async (): Promise<unknown> => null),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin: m.viewerLogin }));
vi.mock('@/lib/learn/learn.data', () => ({ loadLearnProfile: m.loadLearnProfile }));
vi.mock('@/lib/learn/my-progress.data', () => ({ loadLearnTimeZone: m.loadLearnTimeZone }));
vi.mock('@/lib/learn/home.data', () => ({ loadLearnHome: m.loadLearnHome }));
vi.mock('@/lib/learn/setup.data', () => ({ loadLearnSetup: m.loadLearnSetup }));
vi.mock('@/lib/workspace/gate.data', () => ({ loadWorkspaceGate: m.loadWorkspaceGate }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourses: m.loadLearnCourses }));
vi.mock('@/lib/learn/landing.data', () => ({ loadTryLessons: m.loadTryLessons }));
vi.mock('@/lib/learn/real-issues.data', () => ({ loadHomeReal: m.loadHomeReal, loadMergedFixes: m.loadMergedFixes }));
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadMaskedListReads: m.loadMaskedListReads }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
vi.mock('@/components/learn/bar/learn-bar-live', () => ({ LearnBarLive: () => null }));
vi.mock('@/lib/learn/lesson-page.actions', () => ({ answerLearnLessonAction: vi.fn() }));

const { LearnAboutView, LearnFrontView } = await import('./learn-front');
const { LearnHomeError, LearnHomeView } = await import('@/components/learn/home/learn-home-view');
const { homeDay, homeNewLearner } = await import('@/lib/learn/__fixtures__/learn-home-page');
const { courseCards } = await import('@/lib/learn/__fixtures__/course');
const { homeRealFix, landingFixes } = await import('@/lib/learn/__fixtures__/real-issues');
const { NO_HOME_REAL } = await import('@/lib/learn/real-issues');

type Shown = ReactElement<Record<string, unknown>>;

/** The landing a view returns, drawn. */
async function landingHtmlOf(view: unknown): Promise<string | null> {
  if (!isValidElement(view)) return null;
  const element = view as Shown;
  const loaded =
    typeof element.type === 'function' && element.props.viewer
      ? await (element.type as (props: object) => Promise<unknown>)(element.props)
      : null;
  return loaded ? renderToStaticMarkup(loaded as ReactElement) : null;
}

/** The landing a view returns: its viewer, from the page's own mark. */
const landingOf = async (view: unknown) =>
  (await landingHtmlOf(view))?.match(/data-landing-viewer="([^"]+)"/)?.[1] ?? null;

const UNSET = { state: 'NONE', mainLanguage: null, otherLanguages: [], level: null };
const SAVED = { state: 'SAVED', mainLanguage: 'Go', otherLanguages: ['Python'], level: 3 };
const ENTERED = { kind: 'open', entered: true };

beforeEach(() => {
  for (const mock of Object.values(m)) mock.mockReset();
  m.loadLearnCourses.mockResolvedValue(courseCards);
  m.loadTryLessons.mockResolvedValue([]);
  m.loadWorkspaceGate.mockResolvedValue(null);
  m.loadLearnProfile.mockResolvedValue(null);
  m.loadLearnTimeZone.mockResolvedValue(null);
  m.loadHomeReal.mockResolvedValue(NO_HOME_REAL);
  m.loadMergedFixes.mockResolvedValue(null);
  m.loadMaskedListReads.mockResolvedValue(null);
});

const signedIn = ({ home = homeDay as unknown, setup = SAVED as unknown, gate = null as unknown } = {}) => {
  m.viewerLogin.mockResolvedValue('octocat');
  m.loadLearnHome.mockResolvedValue(home);
  m.loadLearnSetup.mockResolvedValue(setup);
  m.loadWorkspaceGate.mockResolvedValue(gate);
};

describe('/learn for a visitor', () => {
  it('is the landing for a visitor, its Markdown copy linked, reading no home', async () => {
    const html = await landingHtmlOf(await LearnFrontView());
    expect(html).toContain('data-landing-viewer="visitor"');
    expect(html).toContain('href="/learn.md"');
    expect(m.loadTryLessons).toHaveBeenCalledWith(courseCards);
    expect(m.loadLearnHome).not.toHaveBeenCalled();
  });

  it('is still the landing when the courses cannot be read', async () => {
    m.loadLearnCourses.mockRejectedValue(new Error('down'));
    expect(await landingOf(await LearnFrontView())).toBe('visitor');
    expect(m.loadTryLessons).toHaveBeenCalledWith([]);
  });

  it('names the newest merged fixes made with Learn, and is as before when they cannot be read', async () => {
    m.loadMergedFixes.mockResolvedValue(landingFixes);
    const html = await landingHtmlOf(await LearnFrontView());
    expect(m.loadMergedFixes).toHaveBeenCalledWith();
    expect(html).toContain('data-landing-fixes');
    expect(html).toContain(landingFixes.rows[0].title);
    m.loadMergedFixes.mockResolvedValue(null);
    expect(await landingHtmlOf(await LearnFrontView())).not.toContain('data-landing-fixes');
  });
});

describe('/learn for someone signed in', () => {
  it('is the landing for someone not set up who has learned nothing', async () => {
    signedIn({ home: homeNewLearner, setup: UNSET });
    expect(await landingOf(await LearnFrontView())).toBe('member');
    expect(m.loadLearnHome).toHaveBeenCalledWith('octocat');
    expect(m.loadLearnSetup).toHaveBeenCalledWith('octocat');
  });

  it('links the Markdown copy for them too', async () => {
    signedIn({ home: homeNewLearner, setup: UNSET });
    const html = await landingHtmlOf(await LearnFrontView());
    expect(html).toContain('data-landing-viewer="member"');
    expect(html).toContain('href="/learn.md"');
  });

  it('links someone part-way through fixing an issue back to Pick an issue', async () => {
    const goal = { goalKind: 'TOPIC', goalValue: 'caching' };
    signedIn({ home: homeNewLearner, setup: UNSET, gate: { kind: 'open', entered: false } });
    m.loadLearnProfile.mockResolvedValue(goal);
    const html = await landingHtmlOf(await LearnFrontView());
    expect(html?.match(/<a [^>]*data-landing-resume[^>]*>/)?.[0]).toContain('href="/learn/start/issues"');

    // No goal saved, a goal that cannot be read, or a gate that is not open: no link.
    for (const [profile, gate] of [
      [null, { kind: 'open', entered: false }],
      [Promise.reject(new Error('down')), { kind: 'open', entered: false }],
      [goal, null],
    ] as const) {
      signedIn({ home: homeNewLearner, setup: UNSET, gate });
      m.loadLearnProfile.mockImplementation(async () => profile);
      expect(await landingHtmlOf(await LearnFrontView())).not.toContain('data-landing-resume');
    }
  });

  it("is Learn home for a learner, drawn at the time of the request in Learn's default zone", async () => {
    signedIn();
    const view = (await LearnFrontView()) as Shown;
    expect(view.type).toBe(LearnHomeView);
    expect(view.props).toMatchObject({ home: homeDay, setup: SAVED, timeZone: null });
    expect(Number.isNaN(Date.parse(view.props.now as string))).toBe(false);
  });

  it('adds the third box and the real issues read apart, with what the masked rows need', async () => {
    signedIn();
    const reads = { looks: null, numbers: { read: 3, kept: 1 } };
    m.loadHomeReal.mockResolvedValue(homeRealFix);
    m.loadMaskedListReads.mockResolvedValue(reads);
    const view = (await LearnFrontView()) as Shown;
    expect(m.loadHomeReal).toHaveBeenCalledWith('octocat');
    expect(view.props).toMatchObject({
      home: homeDay,
      real: homeRealFix,
      reads,
      skillsHref: '/profile/octocat/skills',
    });
  });

  it('draws the home as before when the real issues are not answered, reading nothing for their rows', async () => {
    signedIn();
    const view = (await LearnFrontView()) as Shown;
    expect(view.type).toBe(LearnHomeView);
    expect(view.props).toMatchObject({ home: homeDay, real: NO_HOME_REAL, reads: null });
    expect(m.loadMaskedListReads).not.toHaveBeenCalled();
    // The rows' reads failing leave the rows without their looks line.
    m.loadHomeReal.mockResolvedValue(homeRealFix);
    m.loadMaskedListReads.mockRejectedValue(new Error('down'));
    expect(((await LearnFrontView()) as Shown).props.reads).toBeNull();
  });

  it("counts a learner's days in the zone they saved", async () => {
    signedIn();
    m.loadLearnTimeZone.mockResolvedValue({ timeZone: 'Europe/Berlin' });
    expect(((await LearnFrontView()) as Shown).props.timeZone).toBe('Europe/Berlin');
    expect(m.loadLearnTimeZone).toHaveBeenCalledWith('octocat');
    m.loadLearnTimeZone.mockResolvedValue({ timeZone: null });
    expect(((await LearnFrontView()) as Shown).props.timeZone).toBeNull();
  });

  it('is Learn home for someone who uses Learn today, not set up and with nothing learned', async () => {
    signedIn({ home: homeNewLearner, setup: UNSET, gate: ENTERED });
    expect(((await LearnFrontView()) as Shown).type).toBe(LearnHomeView);
  });

  it('is Learn home when the workspace cannot be read, for someone set up', async () => {
    signedIn();
    m.loadWorkspaceGate.mockRejectedValue(new Error('down'));
    expect(((await LearnFrontView()) as Shown).type).toBe(LearnHomeView);
  });

  it("is Learn home's error when the home cannot be read, never the landing", async () => {
    signedIn({ home: null });
    expect(((await LearnFrontView()) as Shown).type).toBe(LearnHomeError);
    signedIn({ home: null, setup: UNSET });
    expect(((await LearnFrontView()) as Shown).type).toBe(LearnHomeError);
    signedIn({ home: homeNewLearner, setup: null });
    expect(((await LearnFrontView()) as Shown).type).toBe(LearnHomeView);
  });
});

describe('/learn/about, How Learn works', () => {
  it('sends a visitor to /learn, the one address of the landing', async () => {
    await expect(LearnAboutView()).rejects.toThrow('NEXT_REDIRECT /learn');
  });

  it('sends someone not set up to /learn, where the landing is theirs', async () => {
    signedIn({ home: homeNewLearner, setup: UNSET });
    await expect(LearnAboutView()).rejects.toThrow('NEXT_REDIRECT /learn');
  });

  it("is the landing for a learner, under Learn's bar", async () => {
    signedIn();
    const view = (await LearnAboutView()) as ReactElement<{ children: unknown[] }>;
    const children = view.props.children as unknown[];
    expect(await landingOf(children[1])).toBe('learner');
  });
});
