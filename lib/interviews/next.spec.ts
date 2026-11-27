import { describe, expect, it } from 'vitest';

import { nextAfterPart, nextAfterPlan, nextAfterRound, tallgrassStarted } from './__fixtures__/mine';
import { northwindSeniorPlan, tallgrassSrePlan } from './__fixtures__/plans';
import { NEXT_FINISHED_NOTE, nextScreenOf, roundOfPart } from './next';
import { isInterviewPartKey } from './paths';

const PLAN = '/interviews/northwind/senior-software-engineer';
const lessonOf = (slug: string) => `/learn/lessons/${slug}?plan=northwind/senior-software-engineer`;

describe("a part's key on the connecting screen's address", () => {
  it('is a course and a group, or a project', () => {
    expect(isInterviewPartKey('algorithms/graphs')).toBe(true);
    expect(isInterviewPartKey('project/route-finder')).toBe(true);
    for (const key of [null, '', 'graphs', 'algorithms/graphs/more', 'Algorithms/graphs', '../graphs']) {
      expect(isInterviewPartKey(key)).toBe(false);
    }
  });

  it('names the round that holds the part', () => {
    expect(roundOfPart(northwindSeniorPlan, 'algorithms/dynamic-programming')?.number).toBe(3);
    expect(roundOfPart(northwindSeniorPlan, 'algorithms/trees')).toBeNull();
  });
});

describe('the connecting screen after a part, with lessons next', () => {
  const screen = nextScreenOf(northwindSeniorPlan, nextAfterPart, 'algorithms/graphs');

  it('says what was done and where the person is', () => {
    expect(screen.head).toEqual({
      kind: 'part',
      title: 'Graphs',
      lead: '11 lessons learned.',
      where: 'You are in round 3 of 5, Coding interviews.',
    });
  });

  it("names the part's round on the strip, with its parts done", () => {
    expect(screen.strip.round?.number).toBe(3);
    expect(screen.strip.parts).toEqual([true, false, false]);
    expect(screen.strip.words).toEqual({ number: 1, tail: ' of 3 parts done' });
  });

  it('draws the rounds on one line: two passed, the one the person is in, the rest ahead', () => {
    expect(screen.marks.map((mark) => mark.point)).toEqual(['done', 'done', 'here', 'plain', 'plain']);
    expect(screen.marks.slice(0, -1).map((mark) => mark.below)).toEqual(['solid', 'solid', 'grey', 'grey']);
    expect(screen.marks[0].above).toBe('none');
    expect(screen.marks[4].below).toBe('none');
    expect(screen.caption).toEqual({ lead: 'Round 3 of 5', title: 'Coding interviews' });
  });

  it('offers the next part with its one action', () => {
    expect(screen.next).toEqual({
      kind: 'lessons',
      title: 'Dynamic programming',
      sub: '12 lessons from Algorithms and data structures',
      label: 'Start Dynamic programming',
      href: lessonOf('overlapping-subproblems'),
      note: 'It opens the first lesson at once.',
    });
    expect(screen.back).toBe(PLAN);
  });

  it("opens each round's parts in a panel: what was done, and what can be started now", () => {
    expect(screen.panels[0]).toEqual({
      number: 1,
      title: 'Recruiter call',
      aside: 'done',
      parts: [
        {
          key: 'interview-skills/telling-your-story',
          name: 'Telling a clear story',
          words: '6 learned',
          done: true,
          href: lessonOf('a-story-in-three-parts'),
        },
      ],
      open: `${PLAN}#round-1`,
    });
    expect(screen.panels[2].aside).toBe('11 of 28 lessons learned');
    expect(screen.panels[2].parts.map((part) => part.words)).toEqual(['11 learned', '12 lessons', '5 lessons']);
    expect(screen.panels[3]).toMatchObject({ aside: '16 lessons', open: `${PLAN}#round-4` });
    expect(screen.panels[3].parts[0].href).toBe(lessonOf('one-server-to-many'));
  });

  it('lists the rounds on a phone with where the person stands in each', () => {
    expect(screen.phone.map((round) => [round.title, round.words, round.here])).toEqual([
      ['Recruiter call', '6 learned', false],
      ['Online assessment', '9 learned', false],
      ['Coding interviews', 'you are here', true],
      ['System design', '16 lessons', false],
      ['Values interview', '6 lessons', false],
    ]);
  });

  it('continues a part already started, and goes on where its next lesson is', () => {
    const started = {
      ...nextAfterPart,
      mine: {
        ...nextAfterPart.mine,
        rounds: nextAfterPart.mine.rounds.map((round) =>
          round.number === 3
            ? {
                ...round,
                items: round.items.map((item) =>
                  item.key === 'algorithms/dynamic-programming'
                    ? { ...item, done: 2, next: 'dynamic-programming-3' }
                    : item,
                ),
              }
            : round,
        ),
        next: { ...nextAfterPart.mine.next!, lesson: 'dynamic-programming-3' },
      },
    };
    expect(nextScreenOf(northwindSeniorPlan, started, 'algorithms/graphs').next).toMatchObject({
      label: 'Continue Dynamic programming',
      href: lessonOf('dynamic-programming-3'),
      note: null,
    });
  });
});

describe('the connecting screen after a round', () => {
  const screen = nextScreenOf(northwindSeniorPlan, nextAfterRound, 'interview-skills/thinking-aloud');

  it('says which round is done, and how much was learned in it', () => {
    expect(screen.head).toEqual({
      kind: 'round',
      title: 'Round 3: Coding interviews',
      lead: '28 lessons learned in this round.',
      where: null,
    });
    expect(screen.strip.words).toEqual({ number: 3, tail: ' of 3 parts done' });
  });

  it('offers the next round with its facts and its first part', () => {
    expect(screen.next).toEqual({
      kind: 'round',
      title: 'Round 4: System design',
      sub: '1 round, 60 minutes. It starts with Scaling a service, 8 lessons.',
      label: 'Start round 4',
      href: lessonOf('one-server-to-many'),
    });
    expect(screen.marks.map((mark) => mark.point)).toEqual(['done', 'done', 'done', 'here', 'plain']);
    expect(screen.caption).toEqual({ lead: 'Round 4 of 5', title: 'System design' });
  });
});

describe('the connecting screen after the plan', () => {
  const screen = nextScreenOf(northwindSeniorPlan, nextAfterPlan, 'interviewing-at-northwind/northwind-values');

  it('says the plan is done, and how much, with no promise', () => {
    expect(screen.head).toEqual({
      kind: 'plan',
      title: 'Your Northwind interview plan',
      lead: `5 rounds: ${northwindSeniorPlan.lessons} lessons learned, since 2 Nov.`,
      where: null,
    });
    expect(screen.next).toEqual({
      kind: 'finished',
      main: { label: 'Fix a real issue', href: '/contribute' },
      other: { label: 'See other plans', href: '/interviews/northwind' },
      note: NEXT_FINISHED_NOTE,
    });
    expect(NEXT_FINISHED_NOTE).toBe(
      'A finished plan is preparation, not a promise. Your interview plans are not publicly visible.',
    );
  });

  it('ticks every round, with one caption on a phone', () => {
    expect(screen.marks.every((mark) => mark.point === 'done')).toBe(true);
    expect(screen.caption).toEqual({ lead: 'Every round done', title: null });
    expect(screen.phone.map((round) => round.words)).toEqual([
      '6 learned',
      '9 learned',
      '28 learned',
      '16 learned',
      '6 learned',
    ]);
  });
});

describe('a round with nothing to prepare', () => {
  it('has no words on the phone and lists no part, and the line runs through it', () => {
    const next = {
      done: { kind: 'part' as const, name: 'Telling a clear story', lessons: 6 },
      mine: {
        ...tallgrassStarted,
        here: 3,
        rounds: tallgrassStarted.rounds.map((round) =>
          round.number === 1
            ? {
                ...round,
                state: 'done' as const,
                items: round.items.map((item) => ({
                  ...item,
                  done: item.of,
                  lessons: item.lessons.map((lesson) => ({ ...lesson, done: true })),
                })),
              }
            : round,
        ),
        next: { round: tallgrassSrePlan.rounds[2].key, item: 'linux-basics/processes', lesson: null },
      },
    };
    const screen = nextScreenOf(tallgrassSrePlan, next, 'interview-skills/telling-your-story');
    expect(screen.phone[1]).toMatchObject({ title: 'Take-home project', words: null });
    expect(screen.panels[1]).toMatchObject({ aside: null, parts: [] });
    expect(screen.marks.map((mark) => mark.point)).toEqual(['done', 'plain', 'here']);
    expect(screen.marks.slice(0, -1).map((mark) => mark.below)).toEqual(['solid', 'solid']);
    expect(screen.head.where).toBe('You are in round 3 of 3, Systems interview.');
    expect(screen.next).toMatchObject({ title: 'Processes', href: expect.stringContaining('what-a-process-is') });
  });
});
