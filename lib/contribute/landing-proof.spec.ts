import { describe, expect, it } from 'vitest';

import {
  dayMonthOf,
  filesOf,
  type LandingProofPr,
  landingProofOf,
  mergedAfterOf,
  proofByOf,
  proofIssueMarksOf,
  proofRowLineOf,
} from './landing-proof';

const pr = (number: number, mergedAt: string | null): LandingProofPr => ({
  nameWithOwner: 'harbor-kit/relay',
  number,
  url: `https://github.com/harbor-kit/relay/pull/${number}`,
  title: 'Keep the retry delay when the queue reconnects',
  openedAt: '2026-10-27T09:00:00Z',
  mergedAt,
  contributorLogin: 'mira-dev',
  agent: 'Claude Code',
  issue: {
    number: 512,
    url: 'https://github.com/harbor-kit/relay/issues/512',
    title: 'Retry delay resets',
    kind: 'BUG',
    language: 'JS_TS',
  },
  change: { files: 2, added: 14, removed: 3 },
});

const merged = (number: number) => pr(number, '2026-10-30T12:00:00Z');

describe('landingProofOf', () => {
  it.each<[string, LandingProofPr[] | null | undefined, number | null, number | null]>([
    ['three merged: the card and three rows', [merged(1), merged(2), merged(3), merged(4)], 1, 3],
    ['two merged: the card alone', [merged(1), merged(2)], 1, null],
    ['one merged: the card alone', [merged(1)], 1, null],
    ['merged ones come before an open one on the card', [pr(9, null), merged(1)], 1, null],
    ['an open one alone: the card, open', [pr(9, null)], 9, null],
    ['none: neither', [], null, null],
    ['a failed read: neither', null, null, null],
  ])('%s', (_case, read, card, rows) => {
    const proof = landingProofOf(read);
    expect(proof.card?.number ?? null).toBe(card);
    expect(proof.rows?.length ?? null).toBe(rows);
  });
});

describe('mergedAfterOf', () => {
  it.each([
    ['2026-10-27T09:00:00Z', '2026-10-30T12:00:00Z', '3 days after it was sent'],
    ['2026-10-27T09:00:00Z', '2026-10-28T09:00:00Z', '1 day after it was sent'],
    ['2026-10-27T09:00:00Z', '2026-10-27T20:00:00Z', 'the day it was sent'],
    ['2026-10-27T09:00:00Z', null, null],
    ['not a time', '2026-10-30T12:00:00Z', null],
  ])('%s to %s', (openedAt, mergedAt, expected) => {
    expect(mergedAfterOf({ openedAt, mergedAt })).toBe(expected);
  });
});

describe('the proof lines', () => {
  it('names the person and the agent', () => {
    expect(proofByOf(merged(1))).toBe('by mira-dev with Claude Code');
  });

  it('dates a row in UTC, or says it is open', () => {
    expect(dayMonthOf('2026-10-30T23:30:00Z')).toBe('30 Oct');
    expect(proofRowLineOf(merged(1))).toBe('Merged 30 Oct · by mira-dev with Claude Code');
    expect(proofRowLineOf(pr(1, null))).toBe('Open · by mira-dev with Claude Code');
  });

  it('marks the issue with what is known of it', () => {
    expect(proofIssueMarksOf(merged(1).issue)).toEqual(['bug', 'JavaScript / TypeScript']);
    expect(proofIssueMarksOf({ ...merged(1).issue, kind: null, language: null })).toEqual([]);
  });

  it('counts files', () => {
    expect(filesOf(1)).toBe('1 file');
    expect(filesOf(2)).toBe('2 files');
  });
});
