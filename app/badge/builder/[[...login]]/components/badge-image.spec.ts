import { describe, expect, it } from 'vitest';

import { factsVersion, previewSrc } from './badge-image';
import { findBadge } from '@/badge/v3/catalogue';
import { repoBig, repoMid } from '@/badge/v3/fixtures';

const starHistory = findBadge('repo', 'star-history')!;
const rank = findBadge('repo', 'rank')!;

describe('previewSrc', () => {
  it("carries the facts' version, so a preview changes as soon as the entity's data does", () => {
    const before = previewSrc(repoMid, starHistory, {}, 'light');
    expect(before).toBe(`/badge/repo/acme/fastqueue/star-history.svg?theme=light&v=${factsVersion(repoMid)}`);

    const fetched = { ...repoMid, history: repoBig.history };
    expect(factsVersion(fetched)).not.toBe(factsVersion(repoMid));
    expect(previewSrc(fetched, starHistory, {}, 'light')).not.toBe(before);
  });

  it('keeps the same URL for the same facts, and the style before the version', () => {
    expect(factsVersion({ ...repoMid })).toBe(factsVersion(repoMid));
    expect(previewSrc(repoMid, rank, { scheme: 'night', extra: 'month' }, 'dark')).toBe(
      `/badge/repo/acme/fastqueue/rank.svg?extra=month&scheme=night&v=${factsVersion(repoMid)}`,
    );
  });
});
