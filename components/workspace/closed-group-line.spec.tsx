import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ClosedGroupLine } from './closed-group-line';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const link = { href: '/my/agent/key' as Route, label: 'What it is' };

describe('ClosedGroupLine', () => {
  it('closes a group to one line, its link to the page the group lives on', () => {
    const html = renderToStaticMarkup(
      <ClosedGroupLine title="Hosted agent" text="· for Contribute · not set up." link={link} />,
    );
    expect(text(html)).toBe('Hosted agent · for Contribute · not set up. What it is');
    expect(html).toMatch(/href="\/my\/agent\/key"[^>]*>What it is<\/a>/);
  });

  it('opens what it holds in place, folded until the link is pressed', () => {
    const html = renderToStaticMarkup(
      <ClosedGroupLine title="Hosted agent" text="· for Contribute · not set up." link={link}>
        <p>The pitch</p>
      </ClosedGroupLine>,
    );
    expect(html).toMatch(
      /<button type="button" aria-expanded="false" aria-controls="([^"]+)"[^>]*>What it is<\/button>/,
    );
    const id = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(html).toContain(`<div id="${id}" hidden=""><p>The pitch</p></div>`);
    expect(html).not.toContain('href=');
  });
});
