import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  hasStarsNotCounted,
  repoStarsNotCountedText,
  StarCount,
  StarsNotCountedTag,
  StarTotalCount,
  totalStarsNotCountedText,
} from './star-count';

// The hover opens in the browser only: draw its text beside the trigger, so the markup shows both.
vi.mock('../adaptive-tooltip/adaptive-tooltip', () => ({
  AdaptiveTooltip: ({ trigger, children }: { trigger: ReactNode; children: ReactNode }) => (
    <>
      {trigger}
      <div data-hover="">{children}</div>
    </>
  ),
}));

const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('StarCount', () => {
  it('is the plain count when every star counts', () => {
    expect(renderToStaticMarkup(<StarCount stars={6140} />)).toBe('6,140');
    expect(renderToStaticMarkup(<StarCount stars={6140} githubStars={null} notCounted={null} />)).toBe('6,140');
    expect(renderToStaticMarkup(<StarCount stars={13} suffix=" stars" numberClassName="font-mono" />)).toBe(
      '<span class="font-mono">13</span> stars',
    );
  });

  it("strikes GitHub's count through before the honest one, with the hover", () => {
    const html = renderToStaticMarkup(<StarCount stars={13} githubStars={219} notCounted={206} suffix=" stars" />);

    expect(html).toMatch(/<s class="[^"]*line-through[^"]*">.*219<.*<\/s><span>13<\/span><\/span> stars<\/button>/);
    expect(html.indexOf('219')).toBeLessThan(html.indexOf('>13<'));
    expect(html).toContain('type="button"');
    expect(text(html)).toContain('206 stars from suspected fake accounts aren’t counted. GitHub shows 219.');
    expect(html).not.toContain('bought');
  });

  it('works out the stars not counted when only GitHub’s count is given', () => {
    expect(text(renderToStaticMarkup(<StarCount stars={6140} githubStars={9860} />))).toContain(
      '3,720 stars from suspected fake accounts aren’t counted. GitHub shows 9,860.',
    );
  });

  it('formats full in tables and compact in cards', () => {
    expect(text(renderToStaticMarkup(<StarCount stars={22_000} githubStars={31_400} format="full" />))).toMatch(
      /31,400.*22,000/,
    );
    const compact = text(renderToStaticMarkup(<StarCount stars={22_000} githubStars={31_400} format="compact" />));
    expect(compact).toMatch(/31\.4K.*22K/);
    // The hover keeps the exact numbers.
    expect(compact).toContain('9,400 stars from suspected fake accounts aren’t counted. GitHub shows 31,400.');
  });

  it('draws no hover inside another popup', () => {
    const html = renderToStaticMarkup(<StarCount stars={13} githubStars={219} withHover={false} />);

    expect(html).toContain('<s ');
    expect(html).not.toContain('button');
    expect(html).not.toContain('data-hover');
  });

  it('shows no struck count when GitHub shows no more than the honest count', () => {
    expect(renderToStaticMarkup(<StarCount stars={13} githubStars={13} />)).toBe('13');
  });
});

describe('StarTotalCount', () => {
  it('is the plain total when every star counts', () => {
    expect(renderToStaticMarkup(<StarTotalCount stars={312_000} notCounted={null} />)).toBe('312,000');
  });

  it('strikes the total with the stars not counted through before the honest total', () => {
    const html = renderToStaticMarkup(
      <StarTotalCount stars={312_000} notCounted={{ stars: 9_400, repositories: 1 }} />,
    );

    expect(html.indexOf('321,400')).toBeLessThan(html.indexOf('312,000'));
    expect(text(html)).toContain('9,400 stars from suspected fake accounts on 1 repository aren’t counted.');
    expect(text(html)).not.toContain('GitHub shows');
  });

  it('formats compact in cards', () => {
    const html = renderToStaticMarkup(
      <StarTotalCount stars={198_400} notCounted={{ stars: 6_500, repositories: 1 }} format="compact" />,
    );

    expect(text(html)).toMatch(/204\.9K.*198\.4K/);
  });
});

describe('the hover copy', () => {
  it('says repository or repositories, star or stars', () => {
    expect(totalStarsNotCountedText({ stars: 6_500, repositories: 1 })).toBe(
      '6,500 stars from suspected fake accounts on 1 repository aren’t counted.',
    );
    expect(totalStarsNotCountedText({ stars: 12_000, repositories: 3 })).toBe(
      '12,000 stars from suspected fake accounts on 3 repositories aren’t counted.',
    );
    expect(totalStarsNotCountedText({ stars: 1, repositories: 1 })).toBe(
      '1 star from suspected fake accounts on 1 repository isn’t counted.',
    );
    expect(repoStarsNotCountedText(1, 14)).toBe('1 star from suspected fake accounts isn’t counted. GitHub shows 14.');
  });
});

describe('StarsNotCountedTag', () => {
  it('is nothing while every star counts', () => {
    expect(renderToStaticMarkup(<StarsNotCountedTag check={null} />)).toBe('');
  });

  it('opens the repository hover', () => {
    const html = renderToStaticMarkup(<StarsNotCountedTag check={{ notCounted: 206, githubStars: 219 }} />);

    expect(html).toContain('Stars not counted');
    expect(html).toContain('bg-secondary');
    expect(text(html)).toContain('206 stars from suspected fake accounts aren’t counted. GitHub shows 219.');
  });
});

describe('hasStarsNotCounted', () => {
  it('holds only with stars not counted and a GitHub count', () => {
    expect(hasStarsNotCounted({ notCounted: 206, githubStars: 219 })).toBe(true);
    expect(hasStarsNotCounted({ notCounted: 0, githubStars: 219 })).toBe(false);
    expect(hasStarsNotCounted({ notCounted: 206, githubStars: null })).toBe(false);
    expect(hasStarsNotCounted(null)).toBe(false);
    expect(hasStarsNotCounted(undefined)).toBe(false);
  });

  it('keeps the strike and the tag in step', () => {
    const check = { notCounted: 0, githubStars: 219 };

    expect(renderToStaticMarkup(<StarsNotCountedTag check={check} />)).toBe('');
    expect(renderToStaticMarkup(<StarCount stars={13} {...check} />)).toBe('13');
  });
});
