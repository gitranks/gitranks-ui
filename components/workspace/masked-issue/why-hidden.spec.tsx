// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LooksLine, MaskedListFoot, WhyHiddenBody } from './why-hidden';
import { issueNumbers, looksToday } from '@/lib/workspace/__fixtures__/masked-issue';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let wide = true;
window.matchMedia = ((query: string) => ({
  matches: wide,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  wide = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (node: ReactNode) => act(async () => root.render(node));

describe('the window', () => {
  it('gives our numbers first, then three reasons, then what seeing one costs, then the Terms', async () => {
    await render(<WhyHiddenBody numbers={issueNumbers} />);
    const body = container.querySelector('[data-why-hidden]');
    const paragraphs = [...(body?.querySelectorAll(':scope > p') ?? [])].map((each) => each.textContent);
    expect(paragraphs[0]).toBe(
      'We read 2,707,100 open issues and kept 3,138 of them: about 1 in 1,000. Our own rules look first, then two AI models, Jev and Claude.',
    );
    expect([...(body?.querySelectorAll('li .font-semibold') ?? [])].map((each) => each.textContent)).toEqual([
      'Finding them costs us a lot',
      'We made a promise to maintainers',
      'It is fair to you',
    ]);
    expect(paragraphs[1]).toContain(
      'Seeing it costs no money, and it counts toward the full issues you can see in a day.',
    );
    const terms = body?.querySelector('a');
    expect(terms?.textContent).toBe('How you may use issues from GitRanks: our Terms →');
    expect(terms?.getAttribute('href')).toBe('/terms#contribute-rules');
  });

  it('opens from the link under a list, as a dialog', async () => {
    await render(<MaskedListFoot looks={looksToday()} numbers={issueNumbers} />);
    const link = container.querySelector<HTMLButtonElement>('[data-why-hidden-link]');
    expect(link?.textContent).toBe('Why do we hide issue details?');
    await act(async () => link?.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Why we hide issue details');
    expect(dialog?.querySelector('[data-why-hidden]')).not.toBeNull();
  });
});

describe('the line under a list', () => {
  it("sets the day's numbers apart", async () => {
    await render(<LooksLine looks={looksToday()} />);
    expect(container.textContent).toBe('You can see 20 full issues a day. 17 left today.');
    expect([...container.querySelectorAll('.tabular-nums')].map((each) => each.textContent)).toEqual(['20', '17']);
  });

  it('tells a visitor that seeing one needs a sign-in', async () => {
    await render(<LooksLine looks={null} />);
    expect(container.textContent).toBe('Seeing an issue in full needs a GitHub sign-in. It costs no money.');
  });
});
