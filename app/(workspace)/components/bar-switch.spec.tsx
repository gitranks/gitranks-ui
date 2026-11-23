// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/my/settings', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useSearchParams: () => new URLSearchParams(at.search),
}));

const { BarSwitch } = await import('./bar-switch');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LEARN = <nav data-bar="learn" />;
const TABS = <nav data-bar="contribute" />;

const setCookie = (value: string | null) => {
  // biome-ignore lint/suspicious/noDocumentCookie: the spec sets the bar seen last.
  document.cookie = value ? `gr_last_bar=${value}; Path=/` : 'gr_last_bar=; Path=/; Max-Age=0';
};

describe('the bar on the workspace pages', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setCookie(null);
    at.path = '/my/settings';
    at.search = '';
  });

  const shown = (props: Partial<{ learnOpen: boolean; audience: 'both' | 'learner' | 'contributor' }> = {}) => {
    act(() =>
      root.render(
        <BarSwitch learnOpen audience="both" lastBar={null} learn={LEARN} {...props}>
          {TABS}
        </BarSwitch>,
      ),
    );
    return container.querySelector<HTMLElement>('[data-bar]')?.dataset.bar;
  };

  it("shows Learn's bar on Settings opened from Learn, and on its own pages", () => {
    at.search = 'from=learn';
    expect(shown()).toBe('learn');
    at.path = '/my/settings/github';
    expect(shown()).toBe('learn');
  });

  it("shows the bar seen last, read again on each move, else Learn's for someone who only learns", () => {
    expect(shown()).toBe('contribute');
    setCookie('learn');
    expect(shown()).toBe('learn');
    setCookie('contribute');
    expect(shown({ audience: 'learner' })).toBe('contribute');
    setCookie(null);
    expect(shown({ audience: 'learner' })).toBe('learn');
  });

  it("keeps the workspace's tabs elsewhere, and wherever Learn is not open", () => {
    setCookie('learn');
    at.path = '/my/pull-requests';
    at.search = 'from=learn';
    expect(shown()).toBe('contribute');
    at.path = '/my/settings';
    expect(shown({ learnOpen: false })).toBe('contribute');
  });

  it("draws the server's read of the cookie before the page is up", () => {
    const html = renderToStaticMarkup(
      <BarSwitch learnOpen audience="both" lastBar="learn" learn={LEARN}>
        {TABS}
      </BarSwitch>,
    );
    expect(html).toContain('data-bar="learn"');
  });
});
