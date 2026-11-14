import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/lessons/route-cache-miss-8f3k',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/app/learn/actions', () => ({ signInToReact: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({ viewerLogin: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => ({ loadLearnOpen: vi.fn(), loadLearnSetup: vi.fn() }));
vi.mock('@/lib/learn/react-mark', () => ({ hasReactionMark: vi.fn() }));
vi.mock('@/lib/learn/lesson-public.data', () => ({
  loadLessonPage: vi.fn(),
  loadLessonResult: vi.fn(),
  loadMyLessonRun: vi.fn(),
  loadMyResultReaction: vi.fn(),
}));

const { LessonPageScreen, LessonPageView } = await import('./lesson-page');
const { LessonResultScreen, LessonResultView } = await import('./lesson-result');
const { LessonStubScreen } = await import('./lesson-stub');
const data = await import('@/lib/learn/lesson-public.data');
const { hasReactionMark } = await import('@/lib/learn/react-mark');
const { viewerLogin } = await import('@/lib/contribute/contribute.data');
const { loadLearnOpen, loadLearnSetup } = await import('@/lib/learn/learn.data');
const { lessonPage, PUBLIC_HEAD, result, sharedRuns } = await import('@/lib/learn/__fixtures__/shared');
const { STEPS } = await import('@/lib/learn/__fixtures__/lesson');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const MAINTAINER = { canReact: false, mine: null, returned: null };

describe('a shared lesson', () => {
  it('shows a visitor every step, and asks for the GitHub sign-in to answer, never a question or its key', () => {
    const html = renderToStaticMarkup(<LessonPageScreen page={lessonPage} viewer={{ kind: 'visitor' }} />);
    for (const step of STEPS) expect(html).toContain(`data-step-article="${step.id}"`);
    expect(html.match(/data-sign-in-to-answer/g)).toHaveLength(STEPS.length);
    expect(text(html)).toContain('Sign in to take it');
    expect(text(html)).toContain('Created by octocat with Claude Code (Opus)');
    expect(text(html)).toContain('14 people passed it');
    expect(text(html)).toContain("Written for its author's goal: learn TypeScript , level some .");
    expect(html).not.toMatch(/role="radio"|data-why/);
  });

  it('shows how many passed from 2 up only', () => {
    const one = { ...lessonPage, head: { ...PUBLIC_HEAD, passes: 1 } };
    expect(text(renderToStaticMarkup(<LessonPageScreen page={one} viewer={{ kind: 'visitor' }} />))).not.toContain(
      'passed it',
    );
  });

  it('lets a signed-in reader off Learn read it, with nothing to answer', () => {
    const html = renderToStaticMarkup(
      <LessonPageScreen page={lessonPage} viewer={{ kind: 'reader', login: 'mona' }} />,
    );
    expect(text(html)).toContain('Answering is not open to your account yet.');
    expect(html).not.toMatch(/Sign in to|Start the lesson|data-sign-in-to-answer/);
  });

  it('offers a taker without a run to start one, and runs the lesson from their run', () => {
    const start = renderToStaticMarkup(
      <LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'mona', run: null }} />,
    );
    expect(text(start)).toContain('Start the lesson');
    expect(start).not.toContain('data-lesson-phase');

    const taking = renderToStaticMarkup(
      <LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'mona', run: sharedRuns.step }} />,
    );
    expect(taking).toContain('data-lesson-phase="step"');
    expect(taking).toContain('data-question="q2a"');
    expect(text(taking)).toContain("Written for its author's goal");
  });

  it('ends a passed run with its summary and Share my result, no pull request', () => {
    const html = renderToStaticMarkup(
      <LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'mona', run: sharedRuns.passed }} />,
    );
    expect(html).toContain('data-share-result="off"');
    expect(html).toMatch(/role="switch"/);
    expect(text(html)).not.toContain('pull request is now yours');

    const shared = renderToStaticMarkup(
      <LessonPageScreen
        page={lessonPage}
        viewer={{ kind: 'taker', login: 'mona', run: { ...sharedRuns.passed, resultPublic: true } }}
      />,
    );
    expect(shared).toContain('href="/learn/lessons/route-cache-miss-8f3k/passes/mona"');

    const author = renderToStaticMarkup(
      <LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'octocat', run: sharedRuns.passed }} />,
    );
    expect(author).toContain('data-share-result="author"');
  });

  it('reads the lesson as anyone would, and the run only for a viewer Learn is open to', async () => {
    vi.mocked(data.loadLessonPage).mockResolvedValue({ kind: 'found', value: lessonPage });
    vi.mocked(viewerLogin).mockResolvedValue(null);
    expect(renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }))).toContain(
      'data-viewer="visitor"',
    );

    vi.mocked(viewerLogin).mockResolvedValue('mona');
    vi.mocked(loadLearnOpen).mockResolvedValue(false);
    expect(renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }))).toContain(
      'data-viewer="reader"',
    );
    expect(data.loadMyLessonRun).not.toHaveBeenCalled();

    vi.mocked(loadLearnOpen).mockResolvedValue(true);
    vi.mocked(loadLearnSetup).mockResolvedValue(true);
    const setup = renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }));
    expect(setup).toContain('data-viewer="setup"');
    expect(text(setup)).toContain('Setting up your GitRanks account. This takes about a minute. Refresh');
    expect(data.loadMyLessonRun).not.toHaveBeenCalled();

    vi.mocked(loadLearnSetup).mockResolvedValue(false);
    vi.mocked(data.loadMyLessonRun).mockResolvedValue(null);
    expect(renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }))).toContain(
      'data-viewer="taker"',
    );

    vi.mocked(data.loadLessonPage).mockResolvedValue({ kind: 'stub', visibility: 'HELD' });
    expect(text(renderToStaticMarkup(await LessonPageView({ slug: 'x' })))).toContain('This lesson is paused');

    vi.mocked(data.loadLessonPage).mockResolvedValue(null);
    await expect(LessonPageView({ slug: 'x' })).rejects.toThrow('NEXT_NOT_FOUND');

    vi.mocked(data.loadLessonPage).mockResolvedValue({ kind: 'stub', visibility: 'HIDDEN' });
    await expect(LessonPageView({ slug: 'x' })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('a result page', () => {
  it('shows the result per step and the questions that run was asked with their key, never a pick', () => {
    const html = renderToStaticMarkup(<LessonResultScreen result={result()} viewer={MAINTAINER} />);
    const words = text(html);
    expect(words).toContain('octocat passed this lesson');
    expect(words).toContain('Oct 28, 2026 · 11 min · lesson version 1');
    expect(words).toContain('steps passed 5 of 5 known before 1 passed first try 3 needed 2 tries 1');
    expect(words).toContain('Passed on try 2');
    expect(words).toContain('Knew it before');
    expect(html.match(/data-question=/g)).toHaveLength(result().asked.length);
    expect(html.match(/data-mark="right"/g)).toHaveLength(5);
    expect(html).not.toMatch(/data-mark="(hint|picked)"|Check my answer|Good question/);
    expect(words).toContain('Right: the key was the raw text of the path.');
    expect(words).toContain('mona (maintainer of driftwood-js/driftwood) said it helped.');
    expect(words).toContain('An AI agent wrote the fix in pull request #902. Before octocat could submit it');
    expect(html).toContain('href="/contribute/maintainers/report?pr=driftwood-js%2Fdriftwood%23902"');
  });

  it('draws the sign-in a signed-out click asks for, carrying the pick and the page', () => {
    const html = renderToStaticMarkup(
      <LessonResultScreen result={result()} viewer={{ ...MAINTAINER, prompt: 'NO' }} />,
    );
    expect(html).toContain('data-react-sign-in="NO"');
    expect(html).toContain('name="reaction" value="NO"');
    expect(html).toContain('name="login" value="octocat"');
    expect(text(html)).toContain('Sign in with GitHub to send your answer.');
  });

  it("says another taker's result is theirs, not the author's", () => {
    const html = renderToStaticMarkup(
      <LessonResultScreen result={result({ login: 'mona', loginAtPass: 'mona' })} viewer={MAINTAINER} />,
    );
    expect(text(html)).toContain('mona took that lesson and passed it.');
  });

  it('sends a renamed login to the current one, and a missing result to a 404', async () => {
    vi.mocked(data.loadLessonResult).mockResolvedValue({
      kind: 'found',
      value: result({ login: 'octo-new', loginAtPass: 'octocat' }),
    });
    await expect(
      LessonResultView({ slug: 'route-cache-miss-8f3k', login: 'octocat', react: undefined }),
    ).rejects.toThrow('NEXT_REDIRECT /learn/lessons/route-cache-miss-8f3k/passes/octo-new');

    vi.mocked(data.loadLessonResult).mockResolvedValue({ kind: 'found', value: result() });
    vi.mocked(data.loadMyResultReaction).mockResolvedValue({ canReact: true, reaction: 'YES' });
    const html = renderToStaticMarkup(
      await LessonResultView({ slug: 'route-cache-miss-8f3k', login: 'octocat', react: undefined }),
    );
    expect(text(html)).toContain('Thank you: you said it helped.');

    vi.mocked(data.loadLessonResult).mockResolvedValue({ kind: 'stub', visibility: 'REMOVED' });
    expect(text(renderToStaticMarkup(await LessonResultView({ slug: 'x', login: 'y', react: undefined })))).toContain(
      'This lesson was removed by its author',
    );

    vi.mocked(data.loadLessonResult).mockResolvedValue(null);
    await expect(LessonResultView({ slug: 'x', login: 'y', react: undefined })).rejects.toThrow('NEXT_NOT_FOUND');

    vi.mocked(data.loadLessonResult).mockResolvedValue({ kind: 'stub', visibility: 'HIDDEN' });
    await expect(LessonResultView({ slug: 'x', login: 'y', react: undefined })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('takes a ?react= pick only when this browser started the sign-in for it', async () => {
    vi.mocked(data.loadLessonResult).mockResolvedValue({ kind: 'found', value: result() });
    vi.mocked(data.loadMyResultReaction).mockResolvedValue({ canReact: false, reaction: null });

    vi.mocked(hasReactionMark).mockResolvedValue(false);
    const linked = renderToStaticMarkup(
      await LessonResultView({ slug: 'route-cache-miss-8f3k', login: 'octocat', react: 'no' }),
    );
    expect(linked).not.toContain('data-react-sign-in');
    expect(hasReactionMark).toHaveBeenLastCalledWith('route-cache-miss-8f3k', 'octocat', 'NO');

    vi.mocked(hasReactionMark).mockClear();
    await LessonResultView({ slug: 'route-cache-miss-8f3k', login: 'octocat', react: 'maybe' });
    expect(hasReactionMark).not.toHaveBeenCalled();
  });
});

describe('a closed lesson', () => {
  it.each([
    ['REMOVED', 'This lesson was removed by its author'],
    ['HIDDEN', 'This lesson is not available'],
    ['HELD', 'This lesson is paused'],
  ] as const)('%s says so, and names nothing about the lesson', (visibility, title) => {
    const html = renderToStaticMarkup(<LessonStubScreen visibility={visibility} />);
    expect(text(html)).toContain(title);
    expect(html).not.toContain('driftwood');
  });
});
