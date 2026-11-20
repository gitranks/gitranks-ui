import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LimitNotice } from './limit-notice';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('LimitNotice', () => {
  it('says the one sentence, its lead in bold, with the way to the pull requests and to the limit', () => {
    const html = renderToStaticMarkup(<LimitNotice count={8} limit={8} open={8} />);
    expect(text(html)).toBe(
      '8 of your pull requests are waiting on maintainers. A new one can start when one is merged or closed. Pull requests · Change the limit in Settings',
    );
    expect(html).toContain(
      '<span class="font-semibold text-foreground">8 of your pull requests are waiting on maintainers.</span>',
    );
    expect(html).toContain('href="/my/pull-requests"');
    expect(html).toContain('href="/my/settings/pull-requests#open"');
  });

  it('says which wait on the user when some are not open yet', () => {
    expect(text(renderToStaticMarkup(<LimitNotice count={8} limit={8} open={6} />))).toContain(
      '8 of your pull requests are open or on their way. 6 wait on maintainers, 2 on you.',
    );
  });
});
