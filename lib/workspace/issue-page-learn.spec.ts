import { describe, expect, it } from 'vitest';

import { issueLessonLineOf, issuePageLearnOf, startedLineOf } from './issue-page-learn';
import { issueLessonPath } from './paths';
import { learnLessonPath } from '@/lib/learn/paths';

const NOW = new Date('2026-10-28T12:00:00.000Z');
const LESSON = { slug: 'a-queue', title: 'A queue: first in, first out' };

describe("Learn's parts of the page of one issue, as the API answers them", () => {
  it('keeps what the page can draw', () => {
    const started = { agent: 'Claude Code', at: '2026-10-28T11:48:00.000Z', walkthrough: true };
    const lesson = { ...LESSON, course: 'go', courseName: 'Go' };
    expect(issuePageLearnOf({ lesson, why: 'TEACHES_NEW', learnOnly: true, started })).toEqual({
      lesson: LESSON,
      why: 'TEACHES_NEW',
      learnOnly: true,
      started,
    });
  });

  it('drops what it cannot: an unknown why, a lesson or a start of another shape', () => {
    expect(issuePageLearnOf({ lesson: { slug: 1 }, why: 'MAYBE', learnOnly: 'yes', started: { agent: 'x' } })).toEqual({
      lesson: null,
      why: null,
      learnOnly: false,
      started: null,
    });
    expect(issuePageLearnOf(null)).toBeNull();
    expect(issuePageLearnOf('page')).toBeNull();
  });
});

describe('the lesson line', () => {
  it('says "Teaches" for a lesson new to the person and "Uses" for one they learned, linking its page', () => {
    expect(issueLessonLineOf({ lesson: LESSON, why: 'TEACHES_NEW' })).toEqual({
      title: LESSON.title,
      href: '/learn/lessons/a-queue',
      learned: false,
    });
    expect(issueLessonLineOf({ lesson: LESSON, why: 'USES_LEARNED' })?.learned).toBe(true);
  });

  it('is left out with no lesson, with a why that names none, and with no answer', () => {
    expect(issueLessonLineOf({ lesson: null, why: 'NO_LESSON' })).toBeNull();
    expect(issueLessonLineOf({ lesson: LESSON, why: 'NO_LESSON' })).toBeNull();
    expect(issueLessonLineOf({ lesson: LESSON, why: null })).toBeNull();
    expect(issueLessonLineOf(null)).toBeNull();
  });

  it("links the lesson's page as Learn's own paths write it", () => {
    for (const slug of ['a-queue', 'sets-1a2b']) expect(issueLessonPath(slug)).toBe(learnLessonPath(slug));
  });
});

describe('the line of the started state', () => {
  const started = (patch = {}) => ({
    agent: 'Claude Code',
    at: '2026-10-28T11:48:00.000Z',
    walkthrough: true,
    ...patch,
  });

  it('names the agent, when, and whether the walkthrough is on', () => {
    expect(startedLineOf(started(), NOW)).toBe('Claude Code started it 12 minutes ago, with the walkthrough.');
    expect(startedLineOf(started({ walkthrough: false }), NOW)).toBe(
      'Claude Code started it 12 minutes ago, without the walkthrough.',
    );
  });

  it('says a hosted run is the hosted agent, and an agent with no name is yours', () => {
    expect(startedLineOf(started({ agent: 'GitRanks' }), NOW)).toMatch(/^The hosted agent started it/);
    expect(startedLineOf(started({ agent: ' ' }), NOW)).toMatch(/^Your agent started it/);
  });

  it('says "a moment ago" within the minute and for a time ahead of the clock, and no time for none', () => {
    expect(startedLineOf(started({ at: '2026-10-28T11:59:30.000Z' }), NOW)).toContain('started it a moment ago,');
    expect(startedLineOf(started({ at: '2026-10-28T12:05:00.000Z' }), NOW)).toContain('started it a moment ago,');
    expect(startedLineOf(started({ at: 'soon' }), NOW)).toBe('Claude Code started it, with the walkthrough.');
  });
});
