// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContributeTabSkeleton } from './contribute-tab-skeleton';

const draw = () => {
  document.body.innerHTML = renderToStaticMarkup(<ContributeTabSkeleton />);
  return document.body;
};

describe('ContributeTabSkeleton', () => {
  it("holds home's shape and the landing's, and says it is loading", () => {
    const page = draw();
    expect(page.querySelector('[data-contribute-skeleton]')?.getAttribute('aria-busy')).toBe('true');
    expect(page.querySelector('.sr-only')?.textContent).toBe('Loading');
    expect(page.querySelectorAll('[data-skeleton-shape]')).toHaveLength(2);
  });

  it("draws home's three boxes and five rows only while the head guessed the workspace's tabs", () => {
    const home = draw().querySelector('[data-skeleton-shape="home"]');
    expect(home?.className).toContain('hidden');
    expect(home?.className).toContain('[html[data-bar-guess]_&]:flex');
    expect(home?.firstElementChild?.children).toHaveLength(3);
    expect(home?.querySelector('.divide-y')?.children).toHaveLength(5);
  });

  it("draws the landing's head otherwise, and hides it once the tabs are guessed", () => {
    const landing = draw().querySelector('[data-skeleton-shape="landing"]');
    expect(landing?.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(landing?.className).toContain('[html[data-bar-guess]_&]:hidden');
  });
});
