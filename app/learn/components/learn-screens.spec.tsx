import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/attempts/A_1',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/app/learn/actions', () => ({}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadContribute: vi.fn(), loadAttempt: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnOpen: vi.fn(),
  loadLearnSetup: vi.fn(),
  loadAttemptLesson: vi.fn(),
}));

const { QuestionCard } = await import('./question-card');
const { LearnAttemptScreen, LearnAttemptView } = await import('./learn-attempt');
const learnData = await import('@/lib/learn/learn.data');
const { phaseOf } = await import('./lesson-flow');
const { Diagram } = await import('./diagram');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { controlDescriptions, controlNames } = await import('@/lib/learn/__fixtures__/control-names');
const { ExampleQuestion } = await import('./example-question');
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
const screen = (lesson: Parameters<typeof LearnAttemptScreen>[0]['lesson'], at = attempt) =>
  renderToStaticMarkup(<LearnAttemptScreen view={views.active} attempt={at} lesson={lesson} />);

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

describe("a Learn attempt's page", () => {
  it('while the agent works, says the lesson comes next', () => {
    const html = screen(lessons.working);
    expect(text(html)).toContain('Your agent is fixing this issue');
    expect(html).toMatch(/data-stage="fix" data-mark="now"/);
    expect(html).not.toContain('Lesson steps');
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
    expect(text(warmup)).toContain('Start the lesson');

    const step = screen(lessons.step);
    expect(step).toContain('data-lesson-phase="step"');
    expect(text(step)).toContain('Step 2 of 5 · Cause');
    expect(text(step)).toContain('1 of 5 passed');
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
  });

  it('once the pull request is open, shares the lesson and offers to take it down', () => {
    const html = text(screen(lessons.prOpen, detail({ ...attempt, state: 'PR_OPEN' })));
    expect(html).toContain('Pull request #902 is open, and your lesson is public');
    expect(html).toContain('gitranks.com/learn/lessons/route-cache-miss-8f3k/passes/octocat');
    expect(html).toContain('Take it down');
    expect(html).not.toContain('Submit pull request');

    const removed = text(
      screen({ ...lessons.prOpen, visibility: 'REMOVED' }, detail({ ...attempt, state: 'PR_OPEN' })),
    );
    expect(removed).toContain('You took this lesson down');
    expect(removed).not.toContain('Take it down');
  });

  it('shows no stage strip for a pull request opened by hand or an attempt that ended', () => {
    for (const lesson of [lessons.handPr, lessons.ended]) {
      expect(screen(lesson)).not.toContain('Where you are');
    }
    expect(text(screen(lessons.handPr))).toContain('You opened the pull request yourself');
  });
});

describe("a Learn attempt's page while the account is being set up", () => {
  it('says so with a refresh, in place of a not found; closed to anyone Learn is not open to', async () => {
    vi.mocked(learnData.loadLearnOpen).mockResolvedValue(true);
    vi.mocked(learnData.loadLearnSetup).mockResolvedValue(true);
    const html = renderToStaticMarkup(await LearnAttemptView({ params: Promise.resolve({ id: 'A_1' }) }));
    expect(text(html)).toContain('Setting up your GitRanks account. This takes about a minute. Refresh');

    vi.mocked(learnData.loadLearnOpen).mockResolvedValue(false);
    await expect(LearnAttemptView({ params: Promise.resolve({ id: 'A_1' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
