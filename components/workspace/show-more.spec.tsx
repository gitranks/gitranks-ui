import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ShowMore } from './show-more';

const noop = () => {};
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('ShowMore', () => {
  it('says how many show of how many, and shows ten more, the last step the exact number left', () => {
    expect(text(renderToStaticMarkup(<ShowMore shown={10} total={38} noun="issue" onMore={noop} />))).toBe(
      'Showing 10 of 38 issues Show 10 more',
    );
    expect(text(renderToStaticMarkup(<ShowMore shown={30} total={38} noun="issue" onMore={noop} />))).toBe(
      'Showing 30 of 38 issues Show 8 more',
    );
  });

  it('is absent once everything shows', () => {
    expect(renderToStaticMarkup(<ShowMore shown={38} total={38} noun="issue" onMore={noop} />)).toBe('');
  });
});
