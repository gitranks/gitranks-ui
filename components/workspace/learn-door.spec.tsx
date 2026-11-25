// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LearnDoor, LearnDoorDue } from './learn-door';
import { WorkspaceBarFallback } from './workspace-bar-fallback';

const draw = (node: React.ReactElement) => {
  document.body.innerHTML = renderToStaticMarkup(node);
  return document.body;
};
/** What a person reads: each element's words apart, as the page lays them out. */
const text = (node: Element | null) =>
  node?.innerHTML
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

describe('LearnDoor', () => {
  it('opens Learn home as a quiet outlined item, with the room for its count kept', () => {
    const page = draw(<LearnDoor />);
    const door = page.querySelector('a');
    expect(door?.getAttribute('href')).toBe('/learn');
    expect(door?.className).toContain('border-dashed');
    expect(text(door)).toBe('Learn');
    expect(page.querySelector('[data-learn-door-count]')?.className).toContain('min-w-7');
  });

  it('counts the lessons due, and nothing with none due', () => {
    expect(text(draw(<LearnDoor count={<LearnDoorDue due={6} />} />).querySelector('a'))).toBe('Learn 6 lessons due');
    expect(text(draw(<LearnDoor count={<LearnDoorDue due={1} />} />).querySelector('a'))).toBe('Learn 1 lesson due');
    expect(text(draw(<LearnDoor count={<LearnDoorDue due={0} />} />).querySelector('a'))).toBe('Learn');
  });
});

describe('WorkspaceBarFallback', () => {
  it('draws the four tab names, hidden unless the head guessed the tabs show, and the line otherwise', () => {
    const page = draw(<WorkspaceBarFallback />);
    const bar = page.querySelector('[data-bar-fallback]');
    expect([...page.querySelectorAll('[data-fallback-tab]')].map(text)).toEqual([
      'Contribute',
      'Pull requests',
      'Agent',
      'Settings',
    ]);
    expect(bar?.className).toContain('hidden [html[data-bar-guess]_&]:block');
    expect(page.querySelector('[data-bar-fallback-line]')?.className).toContain('[html[data-bar-guess]_&]:hidden');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(page.querySelector('a')).toBeNull();
  });

  it('marks the current tab from the attribute the head sets', () => {
    const page = draw(<WorkspaceBarFallback />);
    expect(page.querySelector('[data-fallback-tab="agent"]')?.className).toContain(
      '[html[data-bar-guess-tab=agent]_&]:font-semibold',
    );
  });

  it('draws as a guess that said yes for the catalogue', () => {
    const page = draw(<WorkspaceBarFallback shown={{ current: 'settings' }} />);
    expect(page.querySelector('[data-bar-fallback]')?.className).not.toContain('hidden');
    expect(page.querySelector('[data-fallback-tab="settings"]')?.className).toContain('font-semibold');
    expect(page.querySelector('[data-bar-fallback-line]')?.className).toContain('hidden');
  });
});
