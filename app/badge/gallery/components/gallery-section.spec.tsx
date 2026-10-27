import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GALLERY_SECTIONS } from '../gallery-badges';
import { GallerySection } from './gallery-section';
import type { EntityFacts } from '@/badge/v3/facts';
import { NOW, orgBig, repoUnranked } from '@/badge/v3/fixtures';

const [, repoSection, orgSection] = GALLERY_SECTIONS;

const render = (section: (typeof GALLERY_SECTIONS)[number], entity: EntityFacts | null) =>
  renderToStaticMarkup(<GallerySection {...section} entity={entity} now={NOW} />).replaceAll('&amp;', '&');

describe('GallerySection', () => {
  it("draws the kind's badges for its #1 with a link to make one", () => {
    const html = render(orgSection, orgBig);

    expect(html).toContain('Organizations');
    expect(html).toContain('href="/org/nebula"');
    expect(html).toContain('href="/badge/builder?org="');
    expect(html).toContain('rel="nofollow"');
  });

  it("leads each badge to the builder's first step for that kind, with the badge kept, not to the #1's code", () => {
    const html = render(orgSection, orgBig);

    expect(html).toContain('href="/badge/builder?org=&badge=org-card"');
    expect(html).toContain('href="/badge/builder?org=&badge=contributors-wall&rows=2"');
    expect(html).not.toContain('step=embed');
    expect(html).not.toContain('org=nebula&');
    expect(html).toContain('title="Make this badge"');
    expect(html).toContain('Click a badge to make it for yours.');
  });

  it('renders nothing without a #1 or without a badge to draw', () => {
    expect(render(repoSection, null)).toBe('');
    expect(render(repoSection, repoUnranked)).toBe('');
  });
});
