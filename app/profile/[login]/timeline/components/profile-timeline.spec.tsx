import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProfileTimeline } from './profile-timeline';
import type { TimelineItemType } from '@/types/profile-timeline.types';

const repos = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `repo-${i}`, stargazers: i }));

const render = (changes: Record<string, unknown>) =>
  renderToStaticMarkup(
    <ProfileTimeline timeline={[{ createdAt: '2026-10-01T00:00:00Z', changes } as unknown as TimelineItemType]} />,
  );

describe('ProfileTimeline', () => {
  it('names ten removed repos of a long list and sums up the rest', () => {
    const html = render({ repoRemoved: { b: repos(14_578), a: null } });

    expect(html).toContain('Repo Removed:');
    expect(html).toContain('repo-14577 ★14,577; ');
    expect(html).toContain('repo-14568 ★14,568; and 14,568 more (★106,106,028)');
    expect(html).not.toContain('repo-14567 ');
    expect(html.length).toBeLessThan(2_000);
  });

  it('reads the totals of an entry that names only the top repos', () => {
    const html = render({ repoRemoved: { b: [{ name: 'top', stargazers: 50 }], a: null, count: 3, stars: 52 } });

    expect(html).toContain('top ★50; and 2 more (★2)');
    expect(html).not.toContain('(removed)');
  });

  it('keeps rendering other changes as before', () => {
    const html = render({ followersCount: { b: 1200, a: 1300 }, bio: { b: 'old bio', a: null } });

    expect(html).toContain('1,200');
    expect(html).toContain('1,300');
    expect(html).toContain('old bio');
    expect(html).toContain('(removed)');
  });
});
