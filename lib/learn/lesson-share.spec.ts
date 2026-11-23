import { describe, expect, it, vi } from 'vitest';

// The state reads a lesson's address through the server's client; here every read is given.
vi.mock('server-only', () => ({}));

import { regexLesson, setLesson } from './__fixtures__/lesson-page';
import type { LearnAddress } from './address-gate';
import { lessonNotServedResponse, lessonShareStateOf, lessonUnavailableResponse } from './lesson-share';
import {
  factCardTextOf,
  learnFactCardUrlOf,
  learnLessonCardUrlOf,
  learnShareTitleOf,
  lessonCardAddressOf,
  lessonCardAddressSize,
  lessonCardTitleSize,
  lessonCardVersionOf,
} from './lesson-share-card';

const reads = (lesson: typeof setLesson | null, address: Pick<LearnAddress, 'state' | 'movedTo'> | null) => ({
  lesson: vi.fn(async () => lesson),
  address: vi.fn(async () => address),
});

describe("a lesson's state, for its copy and its pictures", () => {
  it('is live when the lesson reads as live, without asking its address', async () => {
    const read = reads(setLesson, null);
    expect(await lessonShareStateOf('sets', read)).toEqual({ kind: 'live', lesson: setLesson });
    expect(read.address).not.toHaveBeenCalled();
  });

  it("otherwise follows its address, as the page's gate does", async () => {
    const cases: [Pick<LearnAddress, 'state' | 'movedTo'> | null, unknown][] = [
      [{ state: 'PAUSED', movedTo: null }, { kind: 'paused' }],
      [{ state: 'REMOVED', movedTo: null }, { kind: 'removed' }],
      [
        { state: 'MOVED', movedTo: 'sets-2' },
        { kind: 'moved', slug: 'sets-2' },
      ],
      [{ state: 'MOVED', movedTo: null }, { kind: 'missing' }],
      [{ state: 'MOVED', movedTo: '../x' }, { kind: 'missing' }],
      [{ state: 'MISSING', movedTo: null }, { kind: 'missing' }],
      // Live by its address, yet not readable as live: between two deploys.
      [{ state: 'LIVE', movedTo: null }, { kind: 'missing' }],
      [null, { kind: 'missing' }],
    ];
    for (const [address, state] of cases) {
      expect(await lessonShareStateOf('sets', reads(null, address)), JSON.stringify(address)).toEqual(state);
    }
  });

  it('asks nothing for a slug no lesson can have', async () => {
    const read = reads(setLesson, null);
    for (const slug of ['_gone', 'Sets', 'a/b', '']) {
      expect(await lessonShareStateOf(slug, read), slug).toEqual({ kind: 'missing' });
    }
    expect(read.lesson).not.toHaveBeenCalled();
  });

  it('lets a failed read through, for the route to answer', async () => {
    const read = { lesson: async () => Promise.reject(new Error('down')), address: async () => null };
    await expect(lessonShareStateOf('sets', read)).rejects.toThrow('down');
  });
});

describe('the answer of a lesson that is not served', () => {
  const movedTo = (slug: string) => `/learn/lessons/${slug}.md`;

  it('says in one plain line that it is paused (503, asked again in an hour), removed (410) or not found (404)', async () => {
    const paused = lessonNotServedResponse({ kind: 'paused' }, movedTo);
    expect([paused.status, paused.headers.get('retry-after'), await paused.text()]).toEqual([
      503,
      '3600',
      'This lesson is paused. It will be back at this address.\n',
    ]);
    const removed = lessonNotServedResponse({ kind: 'removed' }, movedTo);
    expect([removed.status, await removed.text()]).toEqual([410, 'This lesson was removed.\n']);
    const missing = lessonNotServedResponse({ kind: 'missing' }, movedTo);
    expect([missing.status, await missing.text()]).toEqual([404, 'Not found\n']);
    for (const response of [paused, removed, missing]) {
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('sends a moved lesson to the same thing at its new address, kept nowhere', () => {
    const moved = lessonNotServedResponse({ kind: 'moved', slug: 'sets-2' }, movedTo);
    expect(moved.status).toBe(308);
    expect(moved.headers.get('location')).toBe('/learn/lessons/sets-2.md');
    expect(moved.headers.get('cache-control')).toBe('private, no-store');
  });

  it('asks again in a minute when the lesson could not be read', () => {
    const response = lessonUnavailableResponse();
    expect([response.status, response.headers.get('retry-after')]).toEqual([503, '60']);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe("a lesson's pictures", () => {
  it('live at one address each, versioned by the time the lesson last changed', () => {
    const v = Date.parse(setLesson.changedAt).toString(36);
    expect(lessonCardVersionOf(setLesson)).toBe(v);
    expect(lessonCardVersionOf({ changedAt: 'not a date' })).toBe('0');
    expect(learnLessonCardUrlOf(setLesson)).toBe(`/learn/lessons/find-duplicates-with-a-set/card.png?v=${v}`);
    expect(learnFactCardUrlOf(setLesson)).toBe(`/learn/lessons/find-duplicates-with-a-set/fact.png?v=${v}`);
    expect(lessonCardVersionOf({ changedAt: '2026-10-22T09:00:00.000Z' })).not.toBe(v);
  });

  it("print the lesson's page address, without the scheme", () => {
    expect(lessonCardAddressOf('sets')).toBe('gitranks.com/learn/lessons/sets');
  });

  it('say a fact in whole sentences, as many as fit in 220 characters', () => {
    const fact = setLesson.fact?.text ?? '';
    expect(factCardTextOf(fact)).toBe(
      'In 2011, researchers showed that one web request could keep a server busy for minutes. The request had thousands of form fields, all chosen to land in the same hash bucket.',
    );
    expect(factCardTextOf(regexLesson.fact?.text ?? '')).toBe(regexLesson.fact?.text);
    expect(factCardTextOf('One.\n  Two!  Three?')).toBe('One. Two! Three?');
    expect(factCardTextOf('It said “stop.” Then it stopped.')).toBe('It said “stop.” Then it stopped.');
  });

  it('cut a first sentence longer than 220 characters at a word', () => {
    const text = factCardTextOf(`${'word '.repeat(60)}end.`);
    expect(text.length).toBeLessThanOrEqual(220);
    expect(text.endsWith('…')).toBe(true);
  });

  it('make a long title smaller in two steps, and a long address smaller', () => {
    expect(lessonCardTitleSize('Find duplicates in one pass with a set')).toBe(62);
    expect(lessonCardTitleSize('x'.repeat(41))).toBe(54);
    expect(lessonCardTitleSize('x'.repeat(65))).toBe(46);
    expect(lessonCardAddressSize('find-duplicates-with-a-set')).toBe(24);
    expect(lessonCardAddressSize('x'.repeat(45))).toBe(20);
  });

  it('have a preview title naming Learn', () => {
    expect(learnShareTitleOf('Sets')).toBe('Sets · GitRanks Learn');
  });
});
