import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TierIcon } from './tier-icon';

describe('TierIcon', () => {
  it('draws every tier on the 48 grid in the current colour', () => {
    const glyphs = new Set<string>();
    for (let tier = 1; tier <= 7; tier++) {
      const html = renderToStaticMarkup(<TierIcon tier={tier} />);
      expect(html).toContain('viewBox="0 0 48 48"');
      expect(html).toMatch(/<(path|rect|circle)/);
      expect(html).not.toMatch(/(fill|stroke)="(?!currentColor|none)/);
      glyphs.add(html);
    }
    expect(glyphs.size).toBe(7);
  });

  it('names the tier only when asked', () => {
    expect(renderToStaticMarkup(<TierIcon tier={1} labelled />)).toContain('<title>Rookie</title>');
    expect(renderToStaticMarkup(<TierIcon tier={7} labelled />)).toContain('<title>Legend</title>');
    expect(renderToStaticMarkup(<TierIcon tier={7} />)).toContain('aria-hidden="true"');
  });
});
