import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BadgesCard } from './badges-card';
import type { EntityFacts } from '@/badge/v3/facts';
import { NOW, orgUnranked, repoBig, repoMid, repoUnranked, userSmall, userUnranked } from '@/badge/v3/fixtures';

const render = (entity: EntityFacts | null) => renderToStaticMarkup(<BadgesCard entity={entity} now={NOW} />);

const decode = (html: string) => html.replaceAll('&amp;', '&');

describe('BadgesCard', () => {
  it("shows the bucket's available badges, each opening its code in the builder", () => {
    const html = decode(render(repoMid));

    expect(html).toContain('/badge/repo/acme/fastqueue/rank.svg?theme=light');
    expect(html).toContain('/badge/repo/acme/fastqueue/rank.svg?theme=dark');
    expect(html).toContain('/badge/repo/acme/fastqueue/language-rank.svg?theme=light');
    expect(html).toContain('/badge/repo/acme/fastqueue/month.svg?theme=light');
    expect(html).toContain('/badge/repo/acme/fastqueue/rank-card.svg?theme=light');
    expect(html).toContain('href="/badge/builder?repo=acme/fastqueue&badge=rank&step=embed"');
    expect(html).toContain('alt="acme/fastqueue on GitRanks: repo rank #41,206 · top 1%"');
    expect(html).toContain('<span class="sr-only"> – get the code</span>');
  });

  it('links to the gallery and to every badge of the entity', () => {
    const html = decode(render(repoBig));

    expect(html).toContain('href="/badge/gallery"');
    expect(html).toContain('href="/badge/builder?repo=nebula/ui"');
    expect(html).toContain('rel="nofollow"');
    expect(html).toContain('/badge/repo/nebula/ui/star-history.svg?theme=light');
    expect(html).toContain('/badge/repo/nebula/ui/starred-by-card.svg?theme=light');
  });

  it("keeps a developer's ranking variant in the image and the builder link", () => {
    const html = decode(render(userSmall));

    expect(html).toContain('/badge/user/octo-dev/rank.svg?by=contributions&theme=light');
    expect(html).toContain('href="/badge/builder?user=octo-dev&badge=rank&by=contributions&step=embed"');
    expect(html).toContain('href="/badge/builder?user=octo-dev&badge=rank&scope=country&step=embed"');
  });

  it('keeps clean image URLs for badges that draw without the star history', () => {
    expect(repoMid.history).toBeNull();
    expect(decode(render(repoMid))).not.toContain('pending=');
    expect(decode(render(repoBig))).not.toContain('pending=');
  });

  it('renders nothing without an available badge or without data', () => {
    expect(render(orgUnranked)).toBe('');
    expect(render(userUnranked)).toBe('');
    expect(render(repoUnranked)).toBe('');
    expect(render(null)).toBe('');
  });
});
