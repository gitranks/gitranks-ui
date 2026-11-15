import { describe, expect, it } from 'vitest';

import { badgeCheckViewOf, checksLeftText, readmeOf } from './badge-check';

const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

describe('badgeCheckViewOf', () => {
  it('invites a check before the first one, for a profile or a repository', () => {
    expect(badgeCheckViewOf('user', 'octo-dev', null, NOW)).toEqual({
      state: 'idle',
      text: 'A profile with a badge on GitHub updates every day. Add the code to your README, then check it here.',
      note: null,
      action: 'Check my badge',
    });
    expect(badgeCheckViewOf('repo', 'brightfern/tidepool', null, NOW)).toMatchObject({
      state: 'idle',
      text: 'A repository with a badge in its README updates every day. Add the code to its README, then check it here.',
      action: 'Check my badge',
    });
  });

  it('names the README it found the badge in, and how it stays on', () => {
    expect(badgeCheckViewOf('user', 'octo-dev', { status: 'found', until: iso(NOW + 7 * 24 * HOUR) }, NOW)).toEqual({
      state: 'found',
      text: 'Badge found in the README of octo-dev/octo-dev. Daily updates are on.',
      note: 'We look again each week. If the badge is gone, daily updates stop.',
      action: null,
    });
    expect(badgeCheckViewOf('repo', 'brightfern/tidepool', { status: 'found', until: iso(NOW) }, NOW).text).toBe(
      'Badge found in the README of brightfern/tidepool. Daily updates are on.',
    );
  });

  it('says a badge is not there yet, with the checks left today', () => {
    expect(badgeCheckViewOf('user', 'octo-dev', { status: 'not_found', checksLeft: 2 }, NOW)).toEqual({
      state: 'not-found',
      text: 'We read the README of octo-dev/octo-dev and did not find the badge yet. Just added it? GitHub can take a minute.',
      note: '2 checks left today.',
      action: 'Check again',
    });
    expect(badgeCheckViewOf('user', 'octo-dev', { status: 'not_found', checksLeft: 1 }, NOW).note).toBe(
      '1 check left today.',
    );
    expect(badgeCheckViewOf('user', 'octo-dev', { status: 'not_found', checksLeft: 0 }, NOW)).toMatchObject({
      note: 'No checks left today.',
      action: null,
    });
  });

  it('says when the next check opens at the limit, with nothing to press', () => {
    expect(badgeCheckViewOf('user', 'octo-dev', { status: 'limit', nextAt: iso(NOW + 5 * HOUR + 1) }, NOW)).toEqual({
      state: 'limit',
      text: 'No more checks for now. The next one opens in 5 h 1 min.',
      note: null,
      action: null,
    });
    expect(badgeCheckViewOf('user', 'octo-dev', { status: 'limit', nextAt: iso(NOW + 20_000) }, NOW).text).toBe(
      'No more checks for now. The next one opens in 1 min.',
    );
  });

  it('shows the failure, without a count, for a name GitRanks does not know and for a check that could not run', () => {
    for (const result of [{ status: 'unknown' } as const, { status: 'unavailable' } as const]) {
      expect(badgeCheckViewOf('repo', 'brightfern/tidepool', result, NOW)).toEqual({
        state: 'failed',
        text: 'We could not check the README of brightfern/tidepool just now. Please try again later.',
        note: null,
        action: 'Check again',
      });
    }
  });
});

describe('badge check words', () => {
  it('reads a profile in its own repository, a repository in itself', () => {
    expect(readmeOf('user', 'octo-dev')).toBe('octo-dev/octo-dev');
    expect(readmeOf('repo', 'acme/fastqueue')).toBe('acme/fastqueue');
  });

  it('counts the checks left in plain words', () => {
    expect([checksLeftText(3), checksLeftText(1), checksLeftText(0), checksLeftText(-1)]).toEqual([
      '3 checks left today.',
      '1 check left today.',
      'No checks left today.',
      'No checks left today.',
    ]);
  });
});
