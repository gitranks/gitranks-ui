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
    expect(html).toContain('href="/badge/builder?org=nebula&badge=org-card&step=embed"');
    expect(html).toContain('rel="nofollow"');
  });

  it('renders nothing without a #1 or without a badge to draw', () => {
    expect(render(repoSection, null)).toBe('');
    expect(render(repoSection, repoUnranked)).toBe('');
  });
});
