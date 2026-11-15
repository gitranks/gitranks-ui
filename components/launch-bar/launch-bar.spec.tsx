import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  LAUNCH_BAR_KEYS,
  LAUNCH_BAR_LEAD,
  LAUNCH_BAR_SCRIPT,
  LAUNCH_BAR_TAIL,
  launchBarAt,
  PRODUCT_HUNT_BARS,
  PRODUCT_HUNT_END_AT,
  PRODUCT_HUNT_LIVE_AT,
} from './launch-bar.consts';
import { isContributePath } from '@/lib/contribute/contribute-path';

vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));

const { LaunchBar } = await import('./launch-bar');

const BEFORE = PRODUCT_HUNT_LIVE_AT - 60_000;
const DURING = PRODUCT_HUNT_LIVE_AT + 60_000;
const AFTER = PRODUCT_HUNT_END_AT + 60_000;

/**
 * Runs the head script against a page at `pathname` at `now`, with `stored` in its storage (or storage that throws).
 * Answers the bar it shows, or `off`.
 */
function runScript(pathname: string, stored: Record<string, string> | 'blocked', now = AFTER) {
  const attributes = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => {
      if (stored === 'blocked') throw new Error('SecurityError');
      return stored[key] ?? null;
    },
  };
  const document = { documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) } };
  const date = { now: () => now };
  new Function('location', 'localStorage', 'document', 'Date', LAUNCH_BAR_SCRIPT)(
    { pathname },
    localStorage,
    document,
    date,
  );
  return attributes.get('data-launch-bar');
}

/** One bar's HTML, from its `<aside>` to the next. */
function barHtml(id: string) {
  const html = renderToStaticMarkup(<LaunchBar />);
  const start = html.indexOf(`<aside data-launch-bar-root="${id}"`);
  expect(start, id).toBeGreaterThanOrEqual(0);
  return html.slice(start, html.indexOf('</aside>', start) + '</aside>'.length);
}

describe('the launch bar', () => {
  it('holds all three bars, in the order they run', () => {
    const html = renderToStaticMarkup(<LaunchBar />);
    const ids = [...html.matchAll(/data-launch-bar-root="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toEqual(['ph-soon', 'ph-live', 'contribute']);
  });

  it("Contribute's is one link into Contribute, counted as top_bar, with the lead on phones, the cue from md and the sentence from xl", () => {
    const html = barHtml('contribute');
    const link = html.match(/<a [^>]*>/)?.[0] ?? '';

    expect(html).toMatch(
      /^<aside data-launch-bar-root="contribute" aria-label="Announcement" class="border-b bg-muted\/40">/,
    );
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

  it.each(['ph-soon', 'ph-live'] as const)(
    '%s is one link to Product Hunt in a new tab, with its X outside it',
    (id) => {
      const html = barHtml(id);
      const copy = PRODUCT_HUNT_BARS[id];
      const link = html.match(/<a [^>]*>/)?.[0] ?? '';

      expect(link).toContain(`href="${copy.href}"`);
      expect(link).toContain('target="_blank"');
      expect(link).toContain('rel="noopener"');
      for (const words of [copy.lead, copy.chip, copy.chipShort, copy.tail, copy.cue]) {
        expect(html).toContain(words);
      }
      expect(html).toMatch(/<button [^>]*aria-label="Hide this announcement"[^>]*>/);
      expect(html.indexOf('</a>')).toBeLessThan(html.indexOf('<button'));
    },
  );

  it('marks the launch with a live dot that pulses only with motion on', () => {
    expect(barHtml('ph-live')).toContain('motion-safe:animate-ping');
    expect(barHtml('ph-soon')).not.toContain('animate-ping');
  });

  it('never asks for a vote', () => {
    for (const copy of Object.values(PRODUCT_HUNT_BARS)) {
      expect(Object.values(copy).join(' ')).not.toMatch(/vote|support us/i);
    }
  });

  it('fits one phone line: logo, lead and the short chip', () => {
    for (const copy of Object.values(PRODUCT_HUNT_BARS)) {
      expect(`${copy.lead} ${copy.chipShort}`.length, copy.lead).toBeLessThanOrEqual(33);
    }
  });
});

describe('the schedule', () => {
  it('runs launching soon, then the launch week, then Contribute again', () => {
    expect(launchBarAt(BEFORE)).toBe('ph-soon');
    expect(launchBarAt(PRODUCT_HUNT_LIVE_AT)).toBe('ph-live');
    expect(launchBarAt(DURING)).toBe('ph-live');
    expect(launchBarAt(PRODUCT_HUNT_END_AT)).toBe('contribute');
    expect(launchBarAt(AFTER)).toBe('contribute');
  });

  it('goes live at 00:01 in San Francisco on Wed Nov 18, and ends a week later', () => {
    expect(new Date(PRODUCT_HUNT_LIVE_AT).toISOString()).toBe('2026-11-18T08:01:00.000Z');
    expect(PRODUCT_HUNT_END_AT - PRODUCT_HUNT_LIVE_AT).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('picks the same bar in the head script as in the app', () => {
    for (const now of [0, BEFORE, PRODUCT_HUNT_LIVE_AT, DURING, PRODUCT_HUNT_END_AT, AFTER]) {
      expect(runScript('/', {}, now), String(now)).toBe(launchBarAt(now));
    }
  });
});

describe('the head script', () => {
  it("shows Contribute's bar on a page outside Contribute in a browser that has not finished with it", () => {
    expect(runScript('/', {})).toBe('contribute');
    expect(runScript('/profile/octo-dev', {})).toBe('contribute');
    expect(runScript('/contributors', {})).toBe('contribute');
  });

  it("hides Contribute's bar on Contribute pages", () => {
    expect(runScript('/contribute', {})).toBe('off');
    expect(runScript('/contribute/faq', {})).toBe('off');
    expect(runScript('//Contribute/', {})).toBe('off');
  });

  it("decides Contribute's pages as the app does", () => {
    const paths = [
      '/',
      '/contribute',
      '/contribute/',
      '/Contribute/faq',
      '//contribute',
      '/%63ontribute',
      '/contribute%2Fx',
      '/contributors',
      '/profile/contribute',
      '/%E0%A4%A',
    ];
    for (const path of paths) expect(runScript(path, {}) === 'off', path).toBe(isContributePath(path));
  });

  it("hides Contribute's bar once this browser dismissed it or opened Contribute", () => {
    expect(runScript('/', { [LAUNCH_BAR_KEYS.contribute]: 'dismissed' })).toBe('off');
    expect(runScript('/', { [LAUNCH_BAR_KEYS.contribute]: 'seen' })).toBe('off');
  });

  it("shows the Product Hunt bars on Contribute's pages too", () => {
    expect(runScript('/contribute', {}, BEFORE)).toBe('ph-soon');
    expect(runScript('/contribute/faq', {}, DURING)).toBe('ph-live');
  });

  it("keeps the Product Hunt bars in a browser that closed or saw Contribute's bar", () => {
    const done = { [LAUNCH_BAR_KEYS.contribute]: 'dismissed' };
    expect(runScript('/', done, BEFORE)).toBe('ph-soon');
    expect(runScript('/', done, DURING)).toBe('ph-live');
  });

  it('hides a Product Hunt bar once closed, and shows the launch bar even after the soon bar was closed', () => {
    const soonClosed = { [LAUNCH_BAR_KEYS['ph-soon']]: 'dismissed' };
    expect(runScript('/', soonClosed, BEFORE)).toBe('off');
    expect(runScript('/', soonClosed, DURING)).toBe('ph-live');
    expect(runScript('/', { [LAUNCH_BAR_KEYS['ph-live']]: 'dismissed' }, DURING)).toBe('off');
  });

  it('keeps the bar names distinct, so no close carries over', () => {
    expect(new Set(Object.values(LAUNCH_BAR_KEYS)).size).toBe(3);
  });

  it("shows the bar where storage is blocked, except Contribute's on Contribute pages", () => {
    expect(runScript('/', 'blocked')).toBe('contribute');
    expect(runScript('/contribute', 'blocked')).toBe('off');
    expect(runScript('/contribute', 'blocked', DURING)).toBe('ph-live');
  });
});
