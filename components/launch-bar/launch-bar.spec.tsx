import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { LAUNCH_BAR_KEY, LAUNCH_BAR_LEAD, LAUNCH_BAR_SCRIPT, LAUNCH_BAR_TAIL } from './launch-bar.consts';

vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));

const { LaunchBar } = await import('./launch-bar');

/** Runs the head script against a page at `pathname`, with `stored` in its storage (or storage that throws). */
function runScript(pathname: string, stored: Record<string, string> | 'blocked') {
  const attributes = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => {
      if (stored === 'blocked') throw new Error('SecurityError');
      return stored[key] ?? null;
    },
  };
  const document = { documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) } };
  new Function('location', 'localStorage', 'document', LAUNCH_BAR_SCRIPT)({ pathname }, localStorage, document);
  return attributes.get('data-launch-bar');
}

describe('the launch bar', () => {
  it('is one link into Contribute, counted as top_bar, with the lead on phones, the cue from md and the sentence from xl', () => {
    const html = renderToStaticMarkup(<LaunchBar />);
    const link = html.match(/<a [^>]*>/)?.[0] ?? '';

    expect(html).toMatch(/^<div data-launch-bar-root="true" class="border-b bg-muted\/40">/);
    expect(link).toContain('href="/contribute"');
    expect(link).toContain('data-contribute-source="top_bar"');
    expect(link).toContain('max-md:min-h-11');
    expect(html).toContain(`<span class="font-medium text-foreground">${LAUNCH_BAR_LEAD}</span>`);
    expect(html).toContain(`<span class="text-muted-foreground max-xl:hidden"> ${LAUNCH_BAR_TAIL}</span>`);
    expect(html).toMatch(/<button [^>]*aria-label="Hide this announcement"[^>]*>/);
    // The X sits outside the link, so pressing it never opens Contribute.
    expect(html.indexOf('</a>')).toBeLessThan(html.indexOf('<button'));
  });

  it('fits one phone line: the lead is short', () => {
    expect(LAUNCH_BAR_LEAD.length).toBeLessThanOrEqual(32);
  });
});

describe('the head script', () => {
  it('leaves the bar on a page outside Contribute in a browser that has not finished with it', () => {
    expect(runScript('/', {})).toBeUndefined();
    expect(runScript('/profile/octo-dev', {})).toBeUndefined();
    expect(runScript('/contributors', {})).toBeUndefined();
  });

  it('hides it on Contribute pages', () => {
    expect(runScript('/contribute', {})).toBe('off');
    expect(runScript('/contribute/faq', {})).toBe('off');
    expect(runScript('//Contribute/', {})).toBe('off');
  });

  it('hides it once this browser dismissed it or opened Contribute', () => {
    expect(runScript('/', { [LAUNCH_BAR_KEY]: 'dismissed' })).toBe('off');
    expect(runScript('/', { [LAUNCH_BAR_KEY]: 'seen' })).toBe('off');
  });

  it('shows it where storage is blocked, except on Contribute pages', () => {
    expect(runScript('/', 'blocked')).toBeUndefined();
    expect(runScript('/contribute', 'blocked')).toBe('off');
  });
});
