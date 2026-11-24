import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
vi.mock('@/lib/workspace/fair-use.actions', () => ({}));

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
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/learn/actions', () => ({ signInToReact: vi.fn(), readPracticeNext: vi.fn() }));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnSetup: vi.fn(),
  loadLearnProfile: vi.fn(async () => null),
}));
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
const { viewerLogin } = await import('@/lib/workspace/contribute.data');
const { loadLearnProfile, loadLearnSetup } = await import('@/lib/learn/learn.data');
const { practiceNext } = await import('@/lib/learn/__fixtures__/home');
const { filledProfile } = await import('@/lib/learn/__fixtures__/profile');
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
    expect(text(html)).toContain('What this lesson covers');
    // What comes next is read once the card shows: nothing drawn before.
    expect(html).not.toContain('data-next-step');
    expect(text(html)).not.toContain('Find me an issue to learn from on GitRanks');

    const shared = renderToStaticMarkup(
      <LessonPageScreen
        page={lessonPage}
        viewer={{ kind: 'taker', login: 'mona', run: { ...sharedRuns.passed, resultPublic: true } }}
      />,
    );
    expect(shared).toContain('href="/learn/lessons/route-cache-miss-8f3k/passes/mona"');
    // A rating already given says it was taken.
    const rated = renderToStaticMarkup(
      <LessonPageScreen
        page={lessonPage}
        viewer={{ kind: 'taker', login: 'mona', run: { ...sharedRuns.passed, worthIt: true } }}
      />,
    );
    expect(text(rated)).toContain('Thanks: that helps us write better lessons.');
    expect(text(html)).not.toContain('Thanks: that helps us');

    const author = renderToStaticMarkup(
      <LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'octocat', run: sharedRuns.passed }} />,
    );
    // An author whose result is not public (hidden, or not shared at the opening) gets the switch, never a dead link.
    expect(author).toContain('data-share-result="off"');
    expect(text(author)).toContain('the link to it in your pull request shows nothing');
    expect(author).not.toContain('/passes/octocat');
    expect(author).not.toContain('data-next-step');
    const opened = renderToStaticMarkup(
      <LessonPageScreen
        page={lessonPage}
        viewer={{ kind: 'taker', login: 'octocat', run: { ...sharedRuns.passed, resultPublic: true } }}
      />,
    );
    expect(opened).toContain('data-share-result="author"');
    expect(opened).toContain('href="/learn/lessons/route-cache-miss-8f3k/passes/octocat"');
    expect(opened).not.toContain('data-next-step');
  });

  it('reads the lesson as anyone would, and the run only for someone signed in', async () => {
    vi.mocked(data.loadLessonPage).mockResolvedValue({ kind: 'found', value: lessonPage });
    vi.mocked(viewerLogin).mockResolvedValue(null);
    const visitor = renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }));
    expect(visitor).toContain('data-viewer="visitor"');
    expect(text(visitor)).toContain('Reading is free. Answering needs a GitHub account');
    expect(data.loadMyLessonRun).not.toHaveBeenCalled();
    expect(loadLearnSetup).not.toHaveBeenCalled();

    vi.mocked(viewerLogin).mockResolvedValue('mona');
    vi.mocked(loadLearnSetup).mockResolvedValue(true);
    const setup = renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }));
    expect(setup).toContain('data-viewer="setup"');
    expect(text(setup)).toContain('Setting up your GitRanks account. This takes about a minute. Refresh');

    vi.mocked(loadLearnSetup).mockResolvedValue(false);
    vi.mocked(data.loadMyLessonRun).mockResolvedValue(null);
    vi.mocked(loadLearnProfile).mockResolvedValue(filledProfile);
    const taker = renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }));
    expect(taker).toContain('data-viewer="taker"');
    // Another learner's lesson is practice, and their goal says "also".
    expect(taker).toContain('data-practice="true"');
    expect(text(taker)).toContain('octocat , who also wanted to learn TypeScript (some experience)');
    // An unread goal leaves "also" out, never the page.
    vi.mocked(loadLearnProfile).mockRejectedValueOnce(new Error('down'));
    expect(text(renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' })))).toContain(
      'octocat , who wanted to learn TypeScript',
    );
    // Its author reads it as before: no goal read.
    vi.mocked(loadLearnProfile).mockClear();
    vi.mocked(viewerLogin).mockResolvedValue('octocat');
    expect(renderToStaticMarkup(await LessonPageView({ slug: 'route-cache-miss-8f3k' }))).not.toContain(
      'data-practice',
    );
    expect(loadLearnProfile).not.toHaveBeenCalled();

    vi.mocked(data.loadLessonPage).mockResolvedValue({ kind: 'stub', visibility: 'HELD' });
    expect(text(renderToStaticMarkup(await LessonPageView({ slug: 'x' })))).toContain('This lesson is paused');

    vi.mocked(data.loadLessonPage).mockResolvedValue(null);
    await expect(LessonPageView({ slug: 'x' })).rejects.toThrow('NEXT_NOT_FOUND');

    vi.mocked(data.loadLessonPage).mockResolvedValue({ kind: 'stub', visibility: 'HIDDEN' });
    await expect(LessonPageView({ slug: 'x' })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('a practice lesson', () => {
  const MONA_GOAL = { kind: 'language', value: 'TypeScript', level: 'Some' };
  const practice = (patch: Record<string, unknown> = {}) =>
    renderToStaticMarkup(
      <LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'mona', run: null, ...patch }} />,
    );

  it('leads back to Learn home, is marked optional, and says where it came from and what it teaches', () => {
    const html = practice({ goal: MONA_GOAL });
    expect(html).toContain('data-practice="true"');
    expect(html).toMatch(/href="\/learn"[^>]*>← Learn home/);
    expect(text(html)).toContain('Practice lesson · optional');
    expect(html).toContain('data-lesson-context');
    const strip = text(html.slice(html.indexOf('data-lesson-context'), html.indexOf('</dl>')));
    expect(strip).toContain('The issue Nested layouts re-render on every navigation #871');
    expect(strip).toContain('Made for octocat , who also wanted to learn TypeScript (some experience)');
    expect(strip).toContain('Made Oct 28, 2026 · from pull request #902');
    expect(strip).toContain('You learn Cache keys Path normalisation');
    // The pull request's state is not shown.
    expect(strip).not.toMatch(/merged|is open|closed/i);
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/902"');
  });

  it('says "also" only when the lesson was written for the viewer\'s own goal', () => {
    expect(text(practice({ goal: { kind: 'language', value: 'JavaScript', level: 'Some' } }))).toContain(
      'octocat , who wanted to learn TypeScript',
    );
    expect(text(practice({ goal: null }))).not.toContain('also wanted');
  });

  it("opens with what a practice lesson is for, and the way past it to the viewer's own issue", () => {
    const html = practice();
    expect(text(html)).toContain('A practice lesson: see how a lesson works');
    expect(text(html)).toContain('Yours will be written for the issue you pick, by your agent, for your goal.');
    expect(html).toMatch(/<a [^>]*data-contribute-source="learn_practice_skip"[^>]*>Skip it: pick your issue →/);
    expect(html).toMatch(/<a [^>]*href="\/learn\/earlier#issues"[^>]*>Skip it/);
    expect(text(html)).toContain('Skip it: pick your issue →');
    expect(text(html)).toContain('Start the lesson');
  });

  it("keeps today's page for its author and the visitor", () => {
    for (const viewer of [{ kind: 'taker', login: 'OctoCat', run: null }, { kind: 'visitor' }] as const) {
      const html = renderToStaticMarkup(<LessonPageScreen page={lessonPage} viewer={viewer} />);
      expect(html, viewer.kind).not.toContain('data-practice');
      expect(html, viewer.kind).not.toContain('data-lesson-context');
      expect(text(html), viewer.kind).not.toContain('Practice lesson');
      expect(text(html), viewer.kind).toContain('A 10-minute lesson from a real fix');
    }
  });

  const passed = (next: unknown) =>
    renderToStaticMarkup(
      <LessonPageScreen
        page={lessonPage}
        viewer={{ kind: 'taker', login: 'mona', run: sharedRuns.passed, next } as never}
      />,
    );

  it("once passed, offers the viewer's own lesson: two issues, all of them, or another practice lesson", () => {
    const html = passed(practiceNext.own);
    expect(html).toContain('data-next-step="own"');
    expect(text(html)).toContain('Now your own lesson');
    expect(text(html)).toContain('Two issues for TypeScript:');
    expect(html.match(/data-side="learn"/g)).toHaveLength(2);
    expect(html.match(/data-contribute-source="learn_practice_passed_issue"/g)).toHaveLength(1);
    // Learn's row: Start a lesson to the Start page, the first one primary.
    expect(html).toMatch(/data-variant="default"[^>]*href="\/my\/start\/driftwood-js\/driftwood\/934\?lesson=1"/);
    expect(text(html).match(/Start a lesson/g)).toHaveLength(2);
    expect(html).toContain('href="/learn/earlier#issues"');
    expect(text(html)).toContain('All issues for your goal →');
    expect(html).toContain('href="/learn/earlier#practice"');
    expect(text(html)).toContain('Or another practice lesson');
    expect(text(html)).not.toContain('Find me an issue to learn from');
  });

  it('once passed with a lesson of their own in progress, leads back to it, with no issue', () => {
    const html = passed(practiceNext.back);
    expect(html).toContain('data-next-step="back"');
    expect(text(html)).toContain('Back to your lesson');
    expect(html).toContain('href="/my/pull-requests/by-attempt/A_1"');
    expect(html).not.toContain('data-side="learn"');
  });

  it('once passed with no issue to start, says why as the Learn tab does', () => {
    const unsupported = passed(practiceNext.unsupported);
    expect(unsupported).toContain('data-issues-empty="goal-unsupported"');
    expect(text(unsupported)).toContain('Learn can’t find issues for this goal yet.');
    // No list to go to for that goal.
    expect(text(unsupported)).not.toContain('All issues for your goal');
    const none = passed({
      current: null,
      issues: { ...practiceNext.own.issues, items: [], total: 0, empty: 'NONE_TODAY' },
    });
    expect(text(none)).toContain('No open issues fit TypeScript today.');
    expect(text(none)).toContain('All issues for your goal →');
  });

  it('once passed with no goal, asks for it first; read failed, the links alone', () => {
    const noGoal = passed(practiceNext.noGoal);
    expect(noGoal).toContain('data-next-step="goal"');
    expect(text(noGoal)).toContain('Tell us what you want to learn');
    // The goal step of fixing an issue with your agent: Learn home asks for no goal.
    expect(noGoal).toMatch(/href="\/learn\/start"[^>]*>Tell us what you want to learn/);
    const unread = passed(null);
    expect(unread).toContain('data-next-step="own"');
    expect(unread).not.toContain('data-side="learn"');
    expect(unread).toContain('href="/learn/earlier#issues"');
  });
});

describe('a result page', () => {
  it('offers the sign-in to take the lesson', async () => {
    // One pass: the card's sentence, not the count.
    const one = result({ head: { ...result().head, passes: 1 } });
    const open = text(renderToStaticMarkup(<LessonResultScreen result={one} viewer={MAINTAINER} />));
    expect(open).toContain('Take it yourself Anyone can read every step. Sign in with GitHub to answer.');
  });

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
    expect(text(html)).toContain(
      'Sign in with GitHub to send your answer: it checks your role on driftwood-js/driftwood. Answers from its maintainers and collaborators appear here with their names.',
    );
  });

  it("shows the result's own person a line in place of the buttons, and no sign-in", () => {
    const html = renderToStaticMarkup(
      <LessonResultScreen result={result()} viewer={{ ...MAINTAINER, own: true, prompt: 'YES' }} />,
    );
    expect(html).toContain('data-own-result');
    expect(text(html)).toContain('This is your pull request: only its reviewers answer here.');
    expect(text(html)).not.toMatch(/Yes, it helped|Sign in with GitHub/);
    expect(html).not.toContain('data-react-sign-in');
    // The reactions and the report link stay.
    expect(text(html)).toContain('mona (maintainer of driftwood-js/driftwood) said it helped.');
    expect(text(html)).toContain('Report this pull request');

    // Another taker's result is linked from no pull request: it asks nothing about one, theirs to read or not.
    for (const viewer of [{ ...MAINTAINER, own: true }, MAINTAINER]) {
      const taker = renderToStaticMarkup(
        <LessonResultScreen result={result({ login: 'mona', loginAtPass: 'mona' })} viewer={viewer} />,
      );
      expect(taker).not.toContain('data-result-reactions');
      expect(text(taker)).not.toMatch(/Did this help you review|Yes, it helped|This is your own result/);
    }

    // The author renamed since: the lesson still names the login they had, and the box stays on their result.
    const renamed = renderToStaticMarkup(
      <LessonResultScreen result={result({ login: 'octo-new', loginAtPass: 'octocat' })} viewer={MAINTAINER} />,
    );
    expect(renamed).toContain('data-result-reactions');
    expect(text(renamed)).toContain('Yes, it helped');
    expect(text(renamed)).toContain('Before octo-new could submit it');

    const other = renderToStaticMarkup(<LessonResultScreen result={result()} viewer={MAINTAINER} />);
    expect(other).not.toContain('data-own-result');
    expect(text(other)).toContain('Yes, it helped');
  });

  it('knows the signed-in person on their own result page, and only there', async () => {
    vi.mocked(data.loadLessonResult).mockResolvedValue({ kind: 'found', value: result() });
    vi.mocked(data.loadMyResultReaction).mockResolvedValue({ canReact: true, reaction: null });
    vi.mocked(hasReactionMark).mockResolvedValue(false);
    const view = () => LessonResultView({ slug: 'route-cache-miss-8f3k', login: 'octocat', react: undefined });

    vi.mocked(viewerLogin).mockResolvedValue('OctoCat');
    vi.mocked(data.loadMyResultReaction).mockClear();
    const own = text(renderToStaticMarkup(await view()));
    expect(own).toContain('This is your pull request: only its reviewers answer here.');
    expect(own).not.toContain('Yes, it helped');
    // Their own result takes no reaction: none is read.
    expect(data.loadMyResultReaction).not.toHaveBeenCalled();

    vi.mocked(viewerLogin).mockResolvedValue('mona');
    expect(text(renderToStaticMarkup(await view()))).toContain('Yes, it helped');

    vi.mocked(viewerLogin).mockResolvedValue(null);
    expect(text(renderToStaticMarkup(await view()))).toContain('Yes, it helped');
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

  it('names nothing at an address that opens nothing, not even GitRanks Learn', () => {
    const html = renderToStaticMarkup(<LessonStubScreen visibility="MISSING" />);
    expect(text(html)).toContain('This page is not available');
    expect(text(html)).not.toMatch(/learn|lesson/i);
    expect(html).not.toContain('/learn/maintainers');
  });
});
