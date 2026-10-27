import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BadgeInline } from './inline';

describe('BadgeInline', () => {
  it('leads a tier value with the tier glyph', () => {
    const html = renderToStaticMarkup(<BadgeInline label="Stars" value="Legend 2" valueTier={7} />);

    expect(html).toContain('viewBox="0 0 48 48"');
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('Legend 2'));
  });

  it('draws no glyph for other values', () => {
    expect(renderToStaticMarkup(<BadgeInline label="Stars" value="#1,234" />)).not.toContain('<svg');
  });
});
