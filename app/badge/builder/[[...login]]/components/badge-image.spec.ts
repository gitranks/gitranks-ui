import { afterEach, describe, expect, it, vi } from 'vitest';

import { factsStamp, previewSrc } from './badge-image';
import { findBadge } from '@/badge/v3/catalogue';
import { repoBig, repoMid } from '@/badge/v3/fixtures';

const starHistory = findBadge('repo', 'star-history')!;
const rank = findBadge('repo', 'rank')!;
const starsCard = findBadge('repo', 'stars-card')!;

afterEach(() => vi.restoreAllMocks());

describe('previewSrc', () => {
  it('stamps a preview while the entity awaits its first read, with the time the builder got the facts', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const facts = { ...repoMid };
    const stamp = (1_700_000_000_000).toString(36);
    expect(previewSrc(facts, starHistory, {}, 'light')).toBe(
      `/badge/repo/acme/fastqueue/star-history.svg?theme=light&pending=${stamp}`,
    );
    expect(previewSrc(facts, starsCard, { scheme: 'night' }, 'dark')).toBe(
      `/badge/repo/acme/fastqueue/stars-card.svg?scheme=night&pending=${stamp}`,
    );
  });

  it('leaves a badge that draws without the missing read clean', () => {
    expect(previewSrc(repoMid, rank, { scheme: 'night', extra: 'month' }, 'dark')).toBe(
      '/badge/repo/acme/fastqueue/rank.svg?extra=month&scheme=night',
    );
  });

  it('keeps one stamp per answer, so a re-render does not fetch again, and a new one for a new answer', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const first = { ...repoMid };
    const before = previewSrc(first, starHistory, {}, 'light');
    now.mockReturnValue(2_000);
    expect(previewSrc(first, starHistory, {}, 'light')).toBe(before);
    expect(factsStamp(first)).toBe(1_000);
    // "Check again" or a reload: a new answer, a new stamp.
    expect(previewSrc({ ...repoMid }, starHistory, {}, 'light')).not.toBe(before);
  });

  it('uses the clean URL once the entity has data', () => {
    expect(previewSrc(repoBig, starHistory, {}, 'dark')).toBe('/badge/repo/nebula/ui/star-history.svg?theme=dark');
    expect(previewSrc(repoBig, rank, { scheme: 'classic' }, 'dark')).toBe(
      '/badge/repo/nebula/ui/rank.svg?scheme=classic',
    );
  });
});
