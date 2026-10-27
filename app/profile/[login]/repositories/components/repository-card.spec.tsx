import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RepositoryCard } from './repository-card';
import { REPO_PAGE_MIN_STARS } from '@/app/app.consts';
import type { Repository } from '@/types/generated/graphql';

const repository = (stargazerCount: number) =>
  ({
    name: 'next.js',
    url: 'https://github.com/vercel/next.js',
    stargazerCount,
    forkCount: 0,
    pushedAt: '2026-01-01T00:00:00Z',
    createdAt: '2020-01-01T00:00:00Z',
  }) as unknown as Repository;

const titleLink = (html: string) => html.match(/<a [^>]*>next\.js<\/a>|<a [^>]*>vercel\/next\.js<\/a>/)?.[0];

describe('RepositoryCard', () => {
  it('links its own repository page from the star threshold', () => {
    const link = titleLink(renderToStaticMarkup(<RepositoryCard repository={repository(REPO_PAGE_MIN_STARS)} />));

    expect(link).toContain('href="/repo/vercel/next.js"');
    expect(link).not.toContain('target="_blank"');
  });

  it('links GitHub below the star threshold', () => {
    const link = titleLink(renderToStaticMarkup(<RepositoryCard repository={repository(REPO_PAGE_MIN_STARS - 1)} />));

    expect(link).toContain('href="https://github.com/vercel/next.js"');
    expect(link).toContain('target="_blank"');
  });

  it('links a contributed repository to its page from the star threshold', () => {
    const link = titleLink(
      renderToStaticMarkup(<RepositoryCard type="contribution" repository={repository(REPO_PAGE_MIN_STARS)} />),
    );

    expect(link).toContain('href="/repo/vercel/next.js"');
    expect(link).not.toContain('target="_blank"');
  });

  it('links a contribution below the star threshold to the repository on GitHub', () => {
    const link = titleLink(
      renderToStaticMarkup(<RepositoryCard type="contribution" repository={repository(REPO_PAGE_MIN_STARS - 1)} />),
    );

    expect(link).toContain('href="https://github.com/vercel/next.js"');
    expect(link).toContain('target="_blank"');
  });
});
