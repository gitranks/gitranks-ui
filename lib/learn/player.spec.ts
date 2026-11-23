import { describe, expect, it } from 'vitest';

import { isRunOver, nextOf, type PlayerRun, recordedOf, runStartOf, runWordsOf, squaresOf } from './player';

const start: PlayerRun = { at: 0, count: 3, results: [] };

describe('the player’s run', () => {
  it('draws one square per question: answered ones by how they went, the current one, the rest waiting', () => {
    expect(squaresOf(start)).toEqual(['current', 'waiting', 'waiting']);
    expect(squaresOf({ at: 2, count: 4, results: ['right', 'wrong'] })).toEqual([
      'right',
      'wrong',
      'current',
      'waiting',
    ]);
  });

  it('records an answer once, and goes on only after it', () => {
    expect(nextOf(start)).toBe(start);
    const answered = recordedOf(start, 'right');
    expect(answered.results).toEqual(['right']);
    expect(recordedOf(answered, 'wrong')).toBe(answered);
    const moved = nextOf(answered);
    expect(moved.at).toBe(1);
    expect(squaresOf(moved)).toEqual(['right', 'current', 'waiting']);
  });

  it('ends past the last question', () => {
    let run = start;
    for (const result of ['right', 'wrong', 'answered'] as const) run = nextOf(recordedOf(run, result));
    expect(run).toEqual({ at: 3, count: 3, results: ['right', 'wrong', 'answered'] });
    expect(isRunOver(run)).toBe(true);
    expect(squaresOf(run)).toEqual(['right', 'wrong', 'answered']);
    expect(recordedOf(run, 'right')).toBe(run);
  });

  it('says where the run stands', () => {
    expect(runWordsOf('Lesson', { at: 2, count: 6, results: ['right', 'right'] })).toEqual({
      lead: 'Lesson ',
      number: 3,
      tail: ' of 6',
    });
    expect(runWordsOf('Lesson', { at: 6, count: 6, results: Array(6).fill('right') })).toEqual({
      lead: '',
      number: 6,
      tail: ' of 6 repeated',
    });
    expect(runWordsOf('Question', { at: 3, count: 9, results: Array(3).fill('answered') }).number).toBe(4);
  });
});

describe('where a run starts', () => {
  it('starts at the first question, or where a saved run can go on from', () => {
    expect(runStartOf(3)).toEqual({ at: 0, count: 3, results: [] });
    expect(runStartOf(3, { at: 1, results: ['right'] })).toEqual({ at: 1, count: 3, results: ['right'] });
    // Answered, not yet gone on from.
    expect(runStartOf(3, { at: 0, results: ['right'] }).at).toBe(0);
  });

  it('never starts where it would be stuck', () => {
    const ahead = runStartOf(4, { at: 3, results: ['right'] });
    expect(ahead.at).toBe(1);
    expect(nextOf(recordedOf(ahead, 'wrong')).at).toBe(2);
    expect(runStartOf(4, { at: -2, results: ['right', 'right'] }).at).toBe(1);
    expect(runStartOf(2, { at: 5, results: ['right', 'wrong', 'right'] })).toEqual({
      at: 2,
      count: 2,
      results: ['right', 'wrong'],
    });
  });
});
