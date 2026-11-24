import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TabsBar } from './tabs-bar';

/** The list's classes, as the page gets them. */
const listClasses = (html: string) => html.match(/<ul class="([^"]*)"/)?.[1].split(' ') ?? [];

describe('TabsBar on a phone', () => {
  it.each([
    ['without items at the end', undefined],
    ['with items at the end', <span key="end">Review</span>],
  ])('fades the list out at its right edge and ends it with a blank as wide, %s', (_title, end) => {
    const classes = listClasses(
      renderToStaticMarkup(
        <TabsBar end={end}>
          <li>Contribute</li>
          <li>Pull requests</li>
        </TabsBar>,
      ),
    );
    // A tab cut by the edge fades out, so it reads as more to scroll to, never as a cut word.
    expect(classes).toContain('max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]');
    // The last tab scrolls clear of the fade.
    expect(classes).toEqual(expect.arrayContaining(['max-sm:after:w-8', 'max-sm:after:shrink-0']));
    // Wider screens are left as they were.
    expect(classes.filter((name) => name.startsWith('sm:'))).toEqual([]);
  });
});
