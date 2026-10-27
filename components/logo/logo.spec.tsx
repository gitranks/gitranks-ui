import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Logo, LogoMark } from './logo';

describe('Logo', () => {
  it('is named GitRanks for screen readers', () => {
    const html = renderToStaticMarkup(<Logo />);

    expect(html).toContain('role="img"');
    expect(html).toContain('<title>GitRanks</title>');
  });

  it('stays out of the accessibility tree when not labelled', () => {
    const html = renderToStaticMarkup(<Logo labelled={false} />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<title>');
  });

  it('follows the site theme by default', () => {
    const html = renderToStaticMarkup(<Logo />);

    expect(html).toContain('fill-[#7f22fe] dark:fill-[#a684ff]');
    expect(html).toContain('fill-[#18181b] dark:fill-[#fafafa]');
  });

  it('draws everything in currentColor, faded blocks included, in mono', () => {
    const html = renderToStaticMarkup(<LogoMark theme="mono" />);

    expect(html).not.toContain('#');
    expect(html).toContain('fill-opacity=".55"');
    expect(html).toContain('fill-opacity=".35"');
  });
});
