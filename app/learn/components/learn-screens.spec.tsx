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
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin: vi.fn(async () => 'octocat'),
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
}));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnSetup: vi.fn(),
  loadAttemptLesson: vi.fn(),
  loadPracticeLessons: vi.fn(),
}));

const { QuestionCard } = await import('@/components/learn/question-card');
const { phaseOf } = await import('@/components/learn/lesson-flow');
const { Diagram } = await import('@/components/workspace/blocks/diagram');
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

describe('code in lesson text', () => {
  it('keeps the spaces inside a code span, which can be the point of a question', async () => {
    const { RichText } = await import('@/components/workspace/blocks/rich-text');
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
