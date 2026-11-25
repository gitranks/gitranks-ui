// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { HomeBoxesView } from './home-boxes';
import { agentRead, homeRead, needsYouRow } from '@/lib/contribute/__fixtures__/wave-4-parts';
import { type HomeBoxesRead, homeBoxesOf } from '@/lib/contribute/home-boxes';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const draw = (read: HomeBoxesRead, hints = true) => {
  document.body.innerHTML = renderToStaticMarkup(<HomeBoxesView home={homeBoxesOf(read)} hints={hints} />);
  return document.body;
};
/** What a person reads: each element's words apart, as the page lays them out. */
const text = (node: Element | null) =>
  node?.innerHTML
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

describe('HomeBoxesView', () => {
  it('draws three boxes in order, the lit one with the edge, the filled button and its Enter hint', () => {
    const page = draw(homeRead({ needsYou: [needsYouRow()] }));
    const boxes = [...page.querySelectorAll('[data-home-box]')];
    expect(boxes.map((box) => box.getAttribute('data-home-box'))).toEqual(['needs-you', 'agent', 'merged']);
    expect(boxes.map((box) => box.hasAttribute('data-lit'))).toEqual([true, false, false]);
    const lit = boxes[0].querySelector('[data-home-enter]');
    expect(lit?.getAttribute('href')).toBe('/my/pull-requests/harbor-kit/relay/512');
    expect(lit?.querySelector('kbd')).not.toBeNull();
    expect(text(boxes[0].querySelector('span'))).toBe('Needs you');
    expect(page.querySelectorAll('[data-home-enter]')).toHaveLength(1);
    expect([...boxes].slice(1).some((box) => box.querySelector('[data-home-enter] kbd'))).toBe(false);
  });

  it('draws no key hint where a keyboard is not the way in', () => {
    expect(draw(homeRead({ needsYou: [needsYouRow()] }), false).querySelector('kbd')).toBeNull();
  });

  it('lights nothing on an ordinary day, and draws a quiet box dashed', () => {
    const page = draw(homeRead());
    expect(page.querySelector('[data-lit]')).toBeNull();
    expect(page.querySelector('[data-home-box="needs-you"]')?.hasAttribute('data-quiet')).toBe(true);
    expect(text(page.querySelector('[data-home-box="needs-you"]'))).toBe(
      'Pull requests Nothing needs you When a pull request needs you, it shows here first. All your pull requests →',
    );
  });

  it('lights connecting when nothing is connected', () => {
    const page = draw(homeRead({ agent: agentRead({ own: null }) }));
    expect(page.querySelector('[data-lit]')?.getAttribute('data-home-box')).toBe('agent');
    expect(page.querySelector('[data-lit] a')?.getAttribute('href')).toBe('/my/agent/connect');
  });

  it('on the first day sends the lit button to the issues below', () => {
    const page = draw(homeRead({ firstDay: true }));
    expect(page.querySelector('[data-lit] a')?.getAttribute('href')).toBe('#issues');
    expect(text(page.querySelector('[data-home-box="merged"]'))).toContain('You read it and send it');
  });
});
