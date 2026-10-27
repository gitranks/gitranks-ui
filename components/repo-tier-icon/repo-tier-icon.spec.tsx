import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RepoTierIcon } from './repo-tier-icon';

describe('RepoTierIcon', () => {
  it('draws every tier in both sizes', () => {
    for (let tier = 1; tier <= 7; tier++) {
      for (const variant of ['large', 'small'] as const) {
        const html = renderToStaticMarkup(<RepoTierIcon tier={tier} variant={variant} />);
        expect(html).toContain(variant === 'large' ? 'viewBox="0 0 48 48"' : 'viewBox="0 0 24 24"');
        expect(html).toMatch(/<(path|circle)/);
      }
    }
  });

  it('gives each icon its own mask ids, so two moons on a page do not share one', () => {
    const html = renderToStaticMarkup(
      <>
        <RepoTierIcon tier={3} />
        <RepoTierIcon tier={3} />
      </>,
    );
    const ids = [...html.matchAll(/<mask id="([^"]+)"/g)].map(([, id]) => id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('names the tier only when asked', () => {
    expect(renderToStaticMarkup(<RepoTierIcon tier={7} labelled />)).toContain('<title>Supernova</title>');
    expect(renderToStaticMarkup(<RepoTierIcon tier={7} />)).toContain('aria-hidden="true"');
  });
});
