import { describe, expect, it } from 'vitest';

import {
  isPrTimelinePath,
  prTimelineCardPath,
  prTimelineFallbackPath,
  prTimelineMarkdownPath,
  prTimelinePath,
  prTimelineRouteOf,
  prTimelineRoutePathOf,
} from './pr-timeline-path';

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

describe("a fix's picture", () => {
  it("lives under the page's address, beside its Markdown twin", () => {
    const pr = { nameWithOwner: 'acme/widgets.js', number: 42 };
    expect(prTimelineCardPath(pr)).toBe('/contribute/pr/acme/widgets.js/42/card.png');
    expect(prTimelineMarkdownPath(pr)).toBe('/contribute/pr/acme/widgets.js/42/timeline.md');
  });

  it('is read as its own kind, so the proxy gates it as it does the page', () => {
    const pr = { nameWithOwner: 'acme/widgets', number: 42 };
    expect(prTimelineRouteOf('/contribute/pr/acme/widgets/42/card.png')).toEqual({ kind: 'card', pr });
    expect(isPrTimelinePath('/contribute/pr/acme/widgets/42/card.png')).toBe(true);
    for (const path of [
      '/contribute/pr/acme/widgets/42/card.png/',
      '/contribute/pr/acme/widgets/42card.png',
      '/contribute/pr/acme/widgets/42/card.jpg',
      '/contribute/pr/acme/widgets/42/card.png/timeline.md',
    ]) {
      expect(prTimelineRouteOf(path), path).toBeNull();
    }
  });

  it("writes a moved page's twin and picture under the address it has now", () => {
    const pr = { nameWithOwner: 'acme/widgets', number: 42 };
    const now = '/contribute/pr/acme/gadgets/42';
    expect(prTimelineRoutePathOf({ kind: 'page', pr }, now)).toBe(now);
    expect(prTimelineRoutePathOf({ kind: 'twin', pr }, now)).toBe(`${now}/timeline.md`);
    expect(prTimelineRoutePathOf({ kind: 'card', pr }, now)).toBe(`${now}/card.png`);
  });
});
