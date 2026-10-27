import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContributionRepositoryCard } from './contribution-repository-card';
import type { Repository } from '@/types/generated/graphql';

const repository = {
  name: 'next.js',
  url: 'https://github.com/vercel/next.js',
  stargazerCount: 1000,
  forkCount: 0,
  pushedAt: '2026-01-01T00:00:00Z',
  createdAt: '2020-01-01T00:00:00Z',
} as unknown as Repository;

describe('ContributionRepositoryCard', () => {
  it('opens the repository page from the title and the pull requests on GitHub from the badge', () => {
    const html = renderToStaticMarkup(
      <ContributionRepositoryCard repository={repository} prsCount={2} mergedPrsCount={2} login="octo" year={2026} />,
    );

    expect(html).toMatch(/<a [^>]*href="\/repo\/vercel\/next\.js"[^>]*>vercel\/next\.js<\/a>/);
    const badge = html.match(/<a [^>]*>2 PRs/)?.[0] ?? '';
    expect(badge).toContain('href="https://github.com/');
    expect(badge).toContain('target="_blank"');
  });
});
