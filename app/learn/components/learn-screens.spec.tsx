import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/pull-requests/driftwood-js/driftwood/871/lesson',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/learn/actions', () => ({}));
const everyone = vi.hoisted(() => ({ open: true }));
vi.mock('@/lib/learn/learn-everyone', () => ({ learnOpenToEveryone: async () => everyone.open }));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin: vi.fn(async () => 'octocat'),
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
}));
const page = vi.hoisted(() => ({ lessonPageOf: vi.fn() }));
vi.mock('@/components/workspace/pull-request/review-view', async (original) => ({
  ...(await original<typeof import('@/components/workspace/pull-request/review-view')>()),
  lessonPageOf: page.lessonPageOf,
}));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnOpen: vi.fn(),
  loadLearnSetup: vi.fn(),
  loadAttemptLesson: vi.fn(),
  loadPracticeLessons: vi.fn(),
}));

const { QuestionCard } = await import('@/components/learn/question-card');
const { LessonViewScreen, LessonView } = await import('./lesson-view');
const learnData = await import('@/lib/learn/learn.data');
const { phaseOf } = await import('@/components/learn/lesson-flow');
const { Diagram } = await import('@/components/learn/diagram');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { controlDescriptions, controlNames } = await import('@/lib/learn/__fixtures__/control-names');
const { ExampleQuestion } = await import('./example-question');
const { practiceLessons } = await import('@/lib/learn/__fixtures__/home');
const { EXAMPLE_LESSON } = await import('@/lib/learn/example-lesson');
const { CAUSE_HINT, CAUSE_QUESTION, FIX_QUESTION, FIX_WHY, lessons, STEPS, WARMUP } = await import(
  '@/lib/learn/__fixtures__/lesson'
);

import type { ComponentProps } from 'react';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const card = (props: Partial<ComponentProps<typeof QuestionCard>> = {}) =>
  renderToStaticMarkup(
    <QuestionCard
      question={CAUSE_QUESTION}
      label="Question"
      picked={[]}
      onPick={() => {}}
      liked={null}
      onLike={() => {}}
      onReport={async () => null}
      {...props}
    />,
  );

describe('the question card', () => {
  it('names every radio button and checkbox by its option text, "I don\'t know yet" and the report reasons too', () => {
    expect(controlNames(card(), 'radio')).toEqual(CAUSE_QUESTION.options.map((option) => option.text));
    expect(controlNames(card({ question: FIX_QUESTION }), 'checkbox')).toEqual(
      FIX_QUESTION.options.map((option) => option.text),
    );
    const warmup = controlNames(card({ question: WARMUP[0], warmup: true }), 'radio');
    expect(warmup.at(-1)).toBe("I don't know yet");
    expect(controlNames(card({ reportDrawn: true }), 'radio').slice(-4)).toEqual([
      'The marked answer is wrong',
      'The question is unclear',
      'It is not about this fix',
      'More than one answer fits',
    ]);
  });

  it("describes a graded option's control by its why, and a right one as the right answer", () => {
    const html = card({ question: FIX_QUESTION, picked: ['q3a1', 'q3a3'], graded: { correct: true, why: FIX_WHY } });
    const described = controlDescriptions(html, 'checkbox');
    expect(described).toHaveLength(4);
    FIX_QUESTION.options.forEach((option, at) => {
      const why = FIX_WHY.find((item) => item.optionId === option.id);
      expect(described[at]).toContain((why?.why ?? '').replaceAll('`', ''));
      expect(described[at].startsWith('Right answer')).toBe(why?.correct === true);
    });
  });

  it("names the front door's example question's radio buttons by their text", () => {
    const html = renderToStaticMarkup(<ExampleQuestion />);
    expect(controlNames(html, 'radio')).toEqual(EXAMPLE_LESSON.question.options.map((option) => option.text));
  });

  it('asks a single-answer question with radio buttons, and checks it once an answer is picked', () => {
    const empty = card({ current: true, onCheck: () => {} });
    expect(empty.match(/role="radio"/g)).toHaveLength(3);
    expect(text(empty)).toContain('Pick one.');
    expect(empty).toMatch(/<button[^>]*disabled=""[^>]*>Check my answer<\/button>/);

    const picked = card({ current: true, onCheck: () => {}, picked: ['q2a2'] });
    expect(picked).not.toMatch(/<button[^>]*disabled=""[^>]*>Check my answer/);
    expect(picked).toMatch(/data-option="q2a2" data-mark="picked"/);
    expect(picked).toContain('border-2 border-primary');
  });

  it('asks a multi-answer question with checkboxes', () => {
    const html = card({ question: FIX_QUESTION, current: true, onCheck: () => {} });
    expect(html.match(/role="checkbox"/g)).toHaveLength(4);
    expect(text(html)).toContain('Pick every answer that fits.');
  });

  it('offers "I don\'t know yet" on a warm-up question, which has no check of its own', () => {
    const html = card({ question: WARMUP[0], label: 'Warm-up 1 of 3', warmup: true });
    expect(html.match(/role="radio"/g)).toHaveLength(4);
    expect(text(html)).toContain("I don't know yet");
    expect(text(html)).not.toContain('Check my answer');
    expect(text(html)).not.toContain('Pick one.');
  });

  it('after a wrong answer keeps only the pick, with why it is not right, and never names the right one', () => {
    const html = text(card({ picked: ['q2a1'], graded: { correct: false, why: CAUSE_HINT } }));
    expect(html).toContain('The cache was emptied on every navigation');
    expect(html).toContain(CAUSE_HINT[0].why);
    expect(html).not.toContain('The two paths are different strings');
    expect(html).not.toContain('Check my answer');
    expect(html).not.toContain('Right');
  });

  it('after a right answer marks the right options, explains every option, and moves on', () => {
    const html = card({
      question: FIX_QUESTION,
      picked: ['q3a1', 'q3a3'],
      graded: { correct: true, why: FIX_WHY },
      current: true,
      onNext: () => {},
    });
    expect(html.match(/data-mark="right"/g)).toHaveLength(2);
    expect(html.match(/data-why=""/g)).toHaveLength(4);
    expect(text(html)).toContain('Next step');
    expect(text(html)).toContain('Right.');
    expect(html).toMatch(/role="checkbox" aria-checked="true"/);
  });

  it('has like, dislike and report on every question, the pick so far pressed', () => {
    const html = card({ liked: true });
    expect(html).toMatch(/aria-label="Good question" aria-pressed="true"/);
    expect(html).toMatch(/aria-label="Bad question" aria-pressed="false"/);
    expect(text(html)).toContain('Report');
  });

  it('reports with one of four reasons', () => {
    const html = text(card({ reportDrawn: true }));
    for (const reason of [
      'The marked answer is wrong',
      'The question is unclear',
      'It is not about this fix',
      'More than one answer fits',
    ]) {
      expect(html).toContain(reason);
    }
    expect(html).toContain('Send report');
  });
});

describe('code in lesson text', () => {
  it('keeps the spaces inside a code span, which can be the point of a question', async () => {
    const { RichText } = await import('@/components/learn/rich-text');
    const html = renderToStaticMarkup(<RichText text="What does `'a  b'.replace(/ /g, '-')` return?" />);
    expect(html.replaceAll('&#x27;', "'")).toContain("'a  b'.replace(/ /g, '-')");
    expect(html).toMatch(/<code class="[^"]*whitespace-break-spaces/);
  });
});

describe('a diagram', () => {
  it('draws a box per node and an arrow per edge, from the layout, with its own arrow head', () => {
    const block = STEPS[1].blocks[2];
    const html = renderToStaticMarkup(<Diagram id="s2-2" nodes={block.nodes} edges={block.edges} label="Two keys" />);
    expect(html.match(/data-node=/g)).toHaveLength(5);
    expect(html.match(/data-edge=/g)).toHaveLength(4);
    expect(html).toContain('id="arrow-s2-2"');
    expect(html).toContain('marker-end="url(#arrow-s2-2)"');
    expect(html).toContain('aria-label="Two keys"');
    expect(html).toContain('fill="var(--warning-soft)"');
  });

  it('draws nothing without nodes', () => {
    expect(renderToStaticMarkup(<Diagram id="x" nodes={[]} edges={[]} label="" />)).toBe('');
  });
});

const attempt = detail({ mode: 'LEARN', runner: 'MCP', sendBacksLeft: 2, prFooter: 'footer' });
const BASE = '/my/pull-requests/driftwood-js/driftwood/871' as Route;
const screen = (lesson: Parameters<typeof LessonViewScreen>[0]['lesson'], at = attempt) =>
  renderToStaticMarkup(<LessonViewScreen view={views.active} attempt={at} lesson={lesson} base={BASE} />);

describe("the lesson's phase", () => {
  it('runs from opening to the warm-up, the steps and the summary, by the run', () => {
    expect(phaseOf('WARMUP', null)).toBe('starting');
    expect(phaseOf('WARMUP', lessons.warmup.run)).toBe('warmup');
    expect(phaseOf('LESSON', lessons.step.run)).toBe('step');
    expect(phaseOf('LESSON', lessons.blocked.run)).toBe('blocked');
    expect(phaseOf('LESSON', lessons.ready.run)).toBe('done');
    for (const stage of ['PR_OPEN', 'HAND_PR', 'ENDED'] as const)
      expect(phaseOf(stage, lessons.ready.run)).toBe('static');
  });

  it('keeps the answer that passed the lesson on its step until the user moves on', () => {
    expect(phaseOf('LESSON', lessons.ready.run, true)).toBe('step');
  });
});

describe("a Learn pull request's Lesson view", () => {
  it('while the agent works, says the lesson comes next', () => {
    const html = screen(lessons.working);
    expect(text(html)).toContain('Your agent is writing your lesson');
    expect(html).not.toContain('Lesson steps');
    // The three-step strip, the way back to the lessons and the issue's line are the header's now.
    expect(html).not.toContain('Where you are');
    expect(text(html)).not.toContain('← My lessons');
  });

  it('opens a run when the lesson has none yet', () => {
    const html = screen({ ...lessons.warmup, run: null });
    expect(html).toContain('data-lesson-phase="starting"');
    expect(text(html)).toContain('Opening your lesson');
  });

  it('asks the warm-up first, then the steps', () => {
    const warmup = screen(lessons.warmup);
    expect(warmup).toContain('data-lesson-phase="warmup"');
    expect(text(warmup)).toContain('Warm-up 3 of 3');
    expect(text(warmup)).toContain('Continue to the lesson');

    const step = screen(lessons.step);
    expect(step).toContain('data-lesson-phase="step"');
    expect(text(step)).toContain('Step 2 of 5 · Cause');
    expect(text(step)).toContain('1 of 5 passed');
    expect(text(step)).toContain('Copy for my agent');
  });

  it("draws a step's newer visuals: a call sequence, a table, an arrow label and two before-and-afters", () => {
    const step = screen(lessons.visuals);
    expect(step).toContain('data-lesson-phase="step"');
    expect(step).toContain('data-diagram="sequence"');
    expect(step).toContain('data-block="table"');
    expect(step).toContain('data-arrow-label=""');
    expect(step).toContain('data-compare="CODE"');
    expect(step).toContain('data-compare="DIAGRAM"');
    expect(text(step)).toContain('Copy for my agent');
  });

  it('after a reload keeps the hint of the last wrong answer above the next question', () => {
    const html = text(screen(lessons.askAgain));
    expect(html).toContain('Your last answer');
    expect(html).toContain(CAUSE_HINT[0].why);
    expect(html).toContain('Try this one');
  });

  it('says the questions need fixing when two steps had every question reported, with the send-back', () => {
    const html = text(screen(lessons.blocked));
    expect(html).toContain('The questions need fixing');
    expect(html).toContain('Send back to my agent');
  });

  it('once passed, shows the summary and the pull request to approve', () => {
    const html = text(screen(lessons.ready));
    expect(html).toContain('Lesson done. You learned 2 new things');
    expect(html).toContain('1 of 3');
    expect(html).toContain('This lesson goes public when the pull request opens');
    expect(html).toContain('Submit pull request');
    // The change is the Pull request view's: one line leads there.
    expect(html).toContain('Read the changes →');
    expect(screen(lessons.ready)).toContain(`href="${BASE}"`);
    // No Details tabs: Changes, Checks and Activity are the Pull request view's, the lesson is this view.
    expect(screen(lessons.ready)).not.toContain('data-session-tabs');
    // The same form as a contribution's page: back from GitHub's access screen (`?resume=`), it opens the pull request.
    expect(screen(lessons.ready)).toContain(`data-pr-form="${attempt.attemptId}"`);
  });

  it('once the pull request is open, shares the lesson and offers to take it down', () => {
    const html = text(screen(lessons.prOpen, detail({ ...attempt, state: 'PR_OPEN' })));
    expect(html).toContain('Pull request #902 is open, and your lesson is public');
    expect(html).toContain('gitranks.com/learn/lessons/route-cache-miss-8f3k/passes/octocat');
    expect(html).toContain('Take it down');
    expect(html).not.toContain('Submit pull request');
    expect(html).toContain('Start the next lesson →');
    // The next issue to learn from is on today's Learn, as the workspace's own "Start the next lesson" says.
    expect(screen(lessons.prOpen, detail({ ...attempt, state: 'PR_OPEN' }))).toMatch(
      /href="\/learn\/earlier"[^>]*>Start the next lesson →/,
    );

    const removed = text(
      screen({ ...lessons.prOpen, visibility: 'REMOVED' }, detail({ ...attempt, state: 'PR_OPEN' })),
    );
    expect(removed).toContain('You took this lesson down');
    expect(removed).not.toContain('Take it down');
  });

  it('while the agent works: no email promised, the terminal, how to give the issue back, practice if they like', () => {
    const html = renderToStaticMarkup(
      <LessonViewScreen
        view={views.active}
        attempt={detail({ mode: 'LEARN' })}
        lesson={lessons.working}
        base={BASE}
        practice={practiceLessons()}
      />,
    );
    expect(text(html)).not.toMatch(/email/i);
    expect(text(html)).toContain('your lesson opens on this page. Your agent tells you in the terminal too.');
    expect(text(html)).toContain('Changed your mind? Ask your agent to release the issue.');
    expect(html).toContain('data-meanwhile');
    expect(text(html)).toContain('While you wait: a practice lesson, if you like');
    // Two of them, then all of them on Learn home.
    expect(html.match(/data-practice-lesson=/g)).toHaveLength(2);
    expect(text(html)).toContain('Made for octocat, who wanted to learn TypeScript (some experience)');
    expect(html).toMatch(/href="\/learn\/earlier#practice"[^>]*>All practice lessons →/);
    expect(html.indexOf('What happens next')).toBeLessThan(html.indexOf('data-meanwhile'));
    // No practice lesson for the goal: the section is left out.
    expect(screen(lessons.working)).not.toContain('data-meanwhile');
    expect(
      renderToStaticMarkup(
        <LessonViewScreen
          view={views.active}
          attempt={detail({ mode: 'LEARN' })}
          lesson={lessons.working}
          base={BASE}
          practice={practiceLessons({ items: [], total: 0 })}
        />,
      ),
    ).not.toContain('data-meanwhile');
  });

  it('once ended, says why in plain words and leads to another issue', () => {
    const ended = (patch: Parameters<typeof detail>[0]) =>
      text(
        renderToStaticMarkup(
          <LessonViewScreen
            view={views.active}
            attempt={detail({ mode: 'LEARN', ...patch })}
            lesson={lessons.ended}
            base={BASE}
          />,
        ),
      );
    expect(ended({ endReason: 'CLAIM_LOST', endDetail: 'claim_lost' })).toContain(
      'The issue changed before your agent could start (someone else took it, or it was closed).',
    );
    expect(ended({ endReason: 'RELEASED', endDetail: 'released' })).toContain('Your agent gave the issue back.');
    const stopped = ended({ endReason: 'MCP_IDLE', endDetail: 'mcp_idle' });
    expect(stopped).toContain('Your agent stopped working on it.');
    // Never the raw end detail.
    expect(stopped).not.toContain('mcp_idle');
    expect(stopped).toContain('Pick another issue');
    const html = renderToStaticMarkup(
      <LessonViewScreen view={views.active} attempt={detail({ mode: 'LEARN' })} lesson={lessons.ended} base={BASE} />,
    );
    expect(html).toMatch(/data-variant="default"[^>]*href="\/learn\/earlier#issues"/);
  });

  it("says a pull request opened by hand is the person's own, the lesson private", () => {
    expect(text(screen(lessons.handPr))).toContain('You opened the pull request yourself');
  });

  it("while the pull request opens: the stepper, or the wait for tomorrow's slot", () => {
    const submit = { step: 'PUSH' as const, waitUntil: null, fork: null, branch: null, lastError: null };
    const opening = text(screen(lessons.ready, detail({ ...attempt, state: 'SUBMITTING', submit })));
    expect(opening).toContain(
      'Opening your pull request… This page moves on by itself. It usually takes under a minute.',
    );
    expect(opening).not.toContain('Submit pull request');
    const tomorrow = text(
      screen(lessons.ready, detail({ ...attempt, state: 'SUBMITTING', submit: { ...submit, step: 'WAITING_CAP' } })),
    );
    expect(tomorrow).toContain("It opens after 00:00 UTC: today's limit of new pull requests is reached.");
  });
});

describe("the Lesson view's page", () => {
  const read = (lesson = lessons.working) => ({ view: views.active, first: attempt, lesson, base: BASE });

  it('says the account is being set up, with a refresh', async () => {
    page.lessonPageOf.mockResolvedValue(read());
    vi.mocked(learnData.loadLearnOpen).mockResolvedValue(true);
    vi.mocked(learnData.loadLearnSetup).mockResolvedValue(true);
    const html = renderToStaticMarkup(
      await LessonView({ params: Promise.resolve({ owner: 'a', repo: 'b', issue: '1' }) }),
    );
    expect(text(html)).toContain('Setting up your GitRanks account. This takes about a minute. Refresh');
  });

  it('reads practice lessons only while the agent works', async () => {
    vi.mocked(learnData.loadLearnOpen).mockResolvedValue(true);
    vi.mocked(learnData.loadLearnSetup).mockResolvedValue(false);
    vi.mocked(learnData.loadPracticeLessons).mockResolvedValue(practiceLessons());
    page.lessonPageOf.mockResolvedValue(read(lessons.working));
    const params = Promise.resolve({ owner: 'a', repo: 'b', issue: '1' });
    const html = renderToStaticMarkup(await LessonView({ params }));
    expect(learnData.loadPracticeLessons).toHaveBeenCalledWith(2);
    expect(html).toContain('data-meanwhile');
    vi.mocked(learnData.loadPracticeLessons).mockClear();
    page.lessonPageOf.mockResolvedValue(read(lessons.ended));
    await LessonView({ params });
    expect(learnData.loadPracticeLessons).not.toHaveBeenCalled();
  });

  it("says the page didn't load while the API does not answer, and nothing to a visitor (the layout signs in)", async () => {
    const params = Promise.resolve({ owner: 'a', repo: 'b', issue: '1' });
    page.lessonPageOf.mockResolvedValue('unread');
    expect(renderToStaticMarkup(await LessonView({ params }))).toContain('data-review="unavailable"');
    page.lessonPageOf.mockResolvedValue(null);
    expect(await LessonView({ params })).toBeNull();
  });
});
