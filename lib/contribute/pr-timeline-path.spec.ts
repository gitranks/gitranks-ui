import { describe, expect, it } from 'vitest';

import { prTimelineFallbackPath, prTimelinePath, prTimelineRouteOf } from './pr-timeline-path';

describe('prTimelineRouteOf', () => {
  it('reads the short address, the page and its twin', () => {
    expect(prTimelineRouteOf('/contribute/pr/6728f0c2a1b2c3d4e5f60718')).toEqual({
      kind: 'short',
      attemptId: '6728f0c2a1b2c3d4e5f60718',
    });
    expect(prTimelineRouteOf('/contribute/pr/acme/widgets.js/42')).toEqual({
      kind: 'page',
      pr: { nameWithOwner: 'acme/widgets.js', number: 42 },
    });
    expect(prTimelineRouteOf('/contribute/pr/acme/widgets/42/timeline.md')).toEqual({
      kind: 'twin',
      pr: { nameWithOwner: 'acme/widgets', number: 42 },
    });
  });

  it('answers nothing for parts no GitHub name or number can be', () => {
    for (const path of [
      '/contribute/pr/not-an-id',
      '/contribute/pr/acme/widgets',
      '/contribute/pr/acme/widgets/0',
      '/contribute/pr/acme/widgets/042',
      '/contribute/pr/-acme/widgets/1',
      '/contribute/pr/acme/../1',
      '/contribute/pr/acme/widgets/1/other',
      '/contribute/pr/%E0%A4%A',
      '/contribute/ledger',
    ]) {
      expect(prTimelineRouteOf(path)).toBeNull();
    }
  });

  it('builds the canonical address and the fallback', () => {
    expect(prTimelinePath({ nameWithOwner: 'acme/widgets', number: 42 })).toBe('/contribute/pr/acme/widgets/42');
    expect(prTimelineFallbackPath('abc')).toBe('/contribute/maintainers?from=abc');
  });
});
