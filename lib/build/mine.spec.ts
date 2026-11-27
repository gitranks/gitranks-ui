import { describe, expect, it } from 'vitest';

import { buildInProgress, buildTestLeft, keyValueDatabaseEndTest } from './__fixtures__/builds';
import {
  MINE_NOW,
  mineBoardEmpty,
  mineBoardFull,
  mineBoardGoldOpensOn,
  mineBoardNoMark,
  mineBoardOne,
  mineBoardOnlyBuilt,
  mineBoardRepeated,
  mineBoardTwoGoldTests,
  mineMcpFirstStep,
  mineMcpInProgress,
} from './__fixtures__/mine';
import {
  dayAfter,
  dayKeyOf,
  goldLineOf,
  isEmptyMine,
  lastStepOf,
  mineListOf,
  mineViewOf,
  removeQuestionOf,
  shortDayOf,
  squaresOf,
  withoutBuild,
} from './mine';

const viewOf = (list: Parameters<typeof mineViewOf>[0]) => mineViewOf(list, MINE_NOW, 'UTC');

describe('My builds: the days', () => {
  it("reads a moment's day in the person's zone", () => {
    expect(dayKeyOf('2026-11-26T23:30:00.000Z', 'UTC')).toBe('2026-11-26');
    expect(dayKeyOf('2026-11-26T23:30:00.000Z', 'Europe/Kyiv')).toBe('2026-11-27');
    expect(dayKeyOf('not a date', 'UTC')).toBeNull();
  });

  it('names a day of this year without its year, and one of another year with it', () => {
    expect(shortDayOf('2026-11-03', '2026-11-26')).toBe('3 Nov');
    expect(shortDayOf('2026-09-30', null)).toBe('30 Sep');
    expect(shortDayOf('2025-12-31', '2026-01-02')).toBe('31 Dec 2025');
    expect(shortDayOf('3 Nov', '2026-11-26')).toBeNull();
  });

  it('says when the last step was in days, then by its day', () => {
    const at = (iso: string) => lastStepOf(iso, MINE_NOW, 'UTC');
    expect(at('2026-11-26T08:00:00.000Z')).toBe('today');
    expect(at('2026-11-25T23:59:00.000Z')).toBe('yesterday');
    expect(at('2026-11-24T18:20:00.000Z')).toBe('2 days ago');
    expect(at('2026-11-13T10:00:00.000Z')).toBe('13 days ago');
    expect(at('2026-11-12T10:00:00.000Z')).toBe('on 12 Nov');
    // A clock a little behind the API's never says a step is in the future.
    expect(at('2026-11-27T01:00:00.000Z')).toBe('today');
    expect(at('')).toBeNull();
  });
});

describe('My builds: the parts of a row', () => {
  it('draws one square a step: passed, the one to do, the ones to come', () => {
    expect(squaresOf(3, 5)).toEqual(['done', 'done', 'current', 'to_come', 'to_come']);
    expect(squaresOf(1, 2)).toEqual(['current', 'to_come']);
    expect(squaresOf(9, 16).filter((square) => square === 'done')).toHaveLength(8);
  });

  it('asks before removing, naming the passed steps only when there are some', () => {
    expect(removeQuestionOf(8)).toBe(
      'Remove this build? Its 8 passed steps are forgotten, and the folder on your computer stays as it is.',
    );
    expect(removeQuestionOf(1)).toBe(
      'Remove this build? Its passed step is forgotten, and the folder on your computer stays as it is.',
    );
    expect(removeQuestionOf(0)).toBe('Remove this build? The folder on your computer stays as it is.');
  });

  it('counts days on from a day, across a month', () => {
    expect(dayAfter('2026-11-26', 7)).toBe('2026-12-03');
    expect(dayAfter('2026-12-28', 7)).toBe('2027-01-04');
    expect(dayAfter(null, 7)).toBeNull();
  });

  it('says one line on the gold test, and nothing once it is earned', () => {
    const first = { waits: false, firstDay: '2026-12-03' };
    expect(goldLineOf({ kind: 'opens_on', date: '2026-12-03' }, first)).toBe('The gold test opens on 3 Dec.');
    expect(goldLineOf({ kind: 'open' }, { ...first, waits: true })).toBe(
      'The gold test is open. It is at the top of this page.',
    );
    expect(goldLineOf({ kind: 'open' }, first)).toBe('The gold test is open.');
    expect(goldLineOf({ kind: 'earned', at: '2026-11-11T09:00:00.000Z' }, first)).toBeNull();
  });

  it('promises the email only once emails go, and only for the day the gold test first opens', () => {
    const first = { waits: false, firstDay: '2026-12-03', emails: true };
    expect(goldLineOf({ kind: 'opens_on', date: '2026-12-03' }, first)).toBe(
      'The gold test opens on 3 Dec. We will email you that day.',
    );
    // A failed try closes it until the next day: no email goes for that.
    expect(goldLineOf({ kind: 'opens_on', date: '2026-12-04' }, first)).toBe('The gold test opens on 4 Dec.');
    expect(goldLineOf({ kind: 'opens_on', date: '2026-12-03' }, { ...first, emails: false })).toBe(
      'The gold test opens on 3 Dec.',
    );
  });
});

describe('My builds: the lists', () => {
  it('draws someone with several as the full board does', () => {
    const view = viewOf(mineBoardFull);
    expect(view.tests.map((row) => [row.project.name, row.text, row.href])).toEqual([
      [
        'Build a key-value database',
        'Python. Every step is done, and the test is left: 10 questions, about 3 minutes. 7 right makes it Built.',
        '/build/key-value-database/test?language=python',
      ],
      [
        'Build a web server',
        'Built on 12 Nov. The gold test is open: 10 questions, and 8 right earns the gold mark. One try a day.',
        '/build/web-server/test/gold?language=typescript',
      ],
    ]);
    expect(view.inProgress.map((row) => [row.project.name, row.language, row.step, row.of, row.lastStep])).toEqual([
      ['Build an MCP server', 'TypeScript', 9, 16, '2 days ago'],
      ['Build a coding agent', 'Python', 3, 18, 'today'],
    ]);
    expect(view.inProgress[0].passed).toBe(8);
    expect(
      view.built.map((row) => [row.project.name, row.meta, row.repeated, row.answeredEveryStep, row.gold]),
    ).toEqual([
      [
        'Build a web server',
        ['TypeScript', 'built 12 Nov', '8 of 10 in the test'],
        false,
        true,
        'The gold test is open. It is at the top of this page.',
      ],
      ['Build a JSON parser', ['Python', 'built 3 Nov', '10 of 10 in the test'], true, true, null],
      ['Build a JSON parser', ['TypeScript', 'built 3 Nov', '10 of 10 in the test'], true, true, null],
    ]);
    expect(view.built[0].answersHref).toBe('/build/web-server/test?language=typescript');
  });

  it('offers each waiting test as a first try when nothing more is read', () => {
    const view = viewOf(mineBoardFull);
    expect(view.tests.map((row) => row.action)).toEqual(['Take the test', 'Take the gold test']);
  });

  it('says where a waiting test stands once read: a run in progress, or a failed try', () => {
    const [endTest, goldTest] = mineBoardFull.tests;
    const view = mineViewOf(mineBoardFull, MINE_NOW, 'UTC', {
      standings: {
        [endTest.build]: { kind: 'failed', right: 3, count: 10, need: 7 },
        [goldTest.build]: { kind: 'going', answered: 3, count: 10 },
      },
    });
    expect(view.tests.map((row) => [row.text, row.action])).toEqual([
      [
        'Python. The test: 3 of 10 right, 7 are needed. Look at your answers, then take it again when you like: the questions will be different.',
        'See your answers and try again',
      ],
      [
        'TypeScript. The gold test: you were on question 4 of 10. Your first three answers are kept. Go on from question 4.',
        'Go on with the gold test',
      ],
    ]);
    const going = mineViewOf(mineBoardFull, MINE_NOW, 'UTC', {
      standings: { [endTest.build]: { kind: 'going', answered: 1, count: 10 } },
    });
    expect([going.tests[0].text, going.tests[0].action]).toEqual([
      'Python. You were on question 2 of 10. Your first answer is kept. Go on from question 2.',
      'Go on with the test',
    ]);
    const none = mineViewOf(mineBoardFull, MINE_NOW, 'UTC', {
      standings: { [endTest.build]: { kind: 'failed', right: 0, count: 10, need: 7 } },
    });
    expect(none.tests[0].text).toMatch(/^Python. The test: none of the 10 right, 7 are needed./);
  });

  it('says when a build with no step passed was started, not when its last step was', () => {
    const view = viewOf({ tests: [], inProgress: [mineMcpFirstStep, mineMcpInProgress], built: [] });
    expect(view.inProgress.map((row) => row.started)).toEqual([true, false]);
  });

  it('draws the usual start: one build in progress and nothing else', () => {
    const view = viewOf(mineBoardOne);
    expect(view.tests).toEqual([]);
    expect(view.built).toEqual([]);
    expect(view.inProgress).toHaveLength(1);
    expect(isEmptyMine(view)).toBe(false);
  });

  it('names the optional parts built, and when the gold test opens', () => {
    const [row] = viewOf(mineBoardGoldOpensOn).built;
    expect(row.meta).toEqual(['TypeScript', 'built 26 Nov', '9 of 10 in the test', '2 of 5 optional parts']);
    expect(row.gold).toBe('The gold test opens on 3 Dec.');
    const emails = mineViewOf(mineBoardGoldOpensOn, MINE_NOW, 'UTC', { emails: true }).built[0];
    expect(emails.gold).toBe('The gold test opens on 3 Dec. We will email you that day.');
    const one = viewOf({ ...mineBoardGoldOpensOn, built: [{ ...mineBoardGoldOpensOn.built[0], partsOf: 1 }] });
    expect(one.built[0].meta.at(-1)).toBe('the optional part built');
  });

  it('shows no mark and no parts where there are none', () => {
    const [row] = viewOf(mineBoardNoMark).built;
    expect(row.meta).toEqual(['Python', 'built 20 Nov', '7 of 10 in the test']);
    expect([row.repeated, row.answeredEveryStep]).toEqual([false, false]);
    expect(row.gold).toBe('The gold test opens on 27 Nov.');
  });

  it('gives a project built and repeated both marks', () => {
    const [row] = viewOf(mineBoardRepeated).built;
    expect([row.repeated, row.answeredEveryStep, row.gold]).toEqual([true, true, null]);
  });

  it('keeps a project built in two languages as two rows', () => {
    expect(viewOf(mineBoardOnlyBuilt).built.map((row) => row.meta[0])).toEqual(['Python', 'TypeScript']);
  });

  it('tells two tests of one project apart by their language', () => {
    expect(viewOf(mineBoardTwoGoldTests).tests.map((row) => row.text.split('.')[0])).toEqual(['TypeScript', 'Python']);
  });

  it('has nothing to show for someone with nothing started', () => {
    expect(isEmptyMine(viewOf(mineBoardEmpty))).toBe(true);
  });

  it('leaves a build whose test waits out of "In progress", and draws only builds of the list they belong to', () => {
    const view = viewOf({
      tests: [{ ...keyValueDatabaseEndTest, build: buildTestLeft.build }],
      inProgress: [buildTestLeft, mineMcpInProgress],
      built: [buildInProgress],
    });
    expect(view.inProgress.map((row) => row.build)).toEqual([mineMcpInProgress.build]);
    expect(view.built).toEqual([]);
  });

  it('takes a removed build out of every list', () => {
    const list = withoutBuild(mineBoardFull, mineMcpInProgress.build);
    expect(list.inProgress.map((build) => build.build)).not.toContain(mineMcpInProgress.build);
    expect(list.tests).toEqual(mineBoardFull.tests);
  });
});

describe("My builds: the route's answer", () => {
  it('reads the wire, where a state carries every kind of field and null where a kind has none', () => {
    const wire = JSON.parse(
      JSON.stringify({
        tests: [keyValueDatabaseEndTest, { build: 'x' }],
        inProgress: [
          {
            ...mineMcpInProgress,
            state: { ...mineMcpInProgress.state, builtAt: null, score: null, gold: null },
          },
        ],
        built: [
          {
            ...mineBoardGoldOpensOn.built[0],
            state: {
              kind: 'built',
              step: null,
              of: null,
              builtAt: '2026-11-26T10:30:00.000Z',
              score: 9,
              gold: { kind: 'opens_on', date: '2026-12-03', at: null },
            },
          },
          { ...mineBoardGoldOpensOn.built[0], state: { kind: 'built', builtAt: null } },
        ],
      }),
    );
    const list = mineListOf(wire);
    expect(list?.tests).toEqual([keyValueDatabaseEndTest]);
    expect(list?.inProgress[0].state).toEqual(mineMcpInProgress.state);
    expect(list?.built).toEqual([mineBoardGoldOpensOn.built[0]]);
  });

  it('refuses an answer that is not a list', () => {
    expect(mineListOf(null)).toBeNull();
    expect(mineListOf({ tests: [] })).toBeNull();
    expect(mineListOf('nope')).toBeNull();
  });
});
