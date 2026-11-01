import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RepositoryCard } from './repository-card';
import { REPO_PAGE_MIN_STARS } from '@/app/app.consts';
import type { Repository } from '@/types/generated/graphql';

const repository = (stargazerCount: number, extra: Partial<Repository> = {}) =>
  ({
    name: 'next.js',
    url: 'https://github.com/vercel/next.js',
    stargazerCount,
    ...extra,
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

  it('shows the honest stars, with a tooltip, while every star counts', () => {
    const html = renderToStaticMarkup(<RepositoryCard repository={repository(21_400)} />);

    expect(html).toContain('title="Stars"');
    expect(html).toContain('<span class="font-mono tabular-nums">21,400</span>');
    expect(html).not.toContain('<s ');
  });

  it("strikes GitHub's count through before the honest one when some stars don't count", () => {
    const html = renderToStaticMarkup(
      <RepositoryCard repository={repository(21_400, { githubStars: 27_900, starsNotCounted: 6_500 })} />,
    );

    expect(html).not.toContain('title="Stars"');
    expect(html).toMatch(/<s [^>]*>.*27,900.*<\/s><span class="font-mono tabular-nums">21,400<\/span>/);
  });
});
