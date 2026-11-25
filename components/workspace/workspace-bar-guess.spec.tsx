// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/learn', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useSearchParams: () => new URLSearchParams(at.search),
}));

const { WorkspaceBarGuess } = await import('./workspace-bar-guess');
const { WorkspaceBarFallback } = await import('./workspace-bar-fallback');
const { TabsBar } = await import('@/components/tabs/tabs-bar');
const { BAR_GUESS_SCRIPT } = await import('@/lib/workspace/workspace-bar-guess');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const html = document.documentElement;

const setCookies = (lastBar: 'learn' | 'contribute' | null, session = true) => {
  // biome-ignore lint/suspicious/noDocumentCookie: the spec sets the session hint the guess reads.
  document.cookie = session ? 'has-session=1; Path=/' : 'has-session=; Path=/; Max-Age=0';
  // biome-ignore lint/suspicious/noDocumentCookie: and the bar seen last.
  document.cookie = lastBar ? `gr_last_bar=${lastBar}; Path=/` : 'gr_last_bar=; Path=/; Max-Age=0';
};

const marks = () => ({ shown: html.hasAttribute('data-bar-guess'), tab: html.getAttribute('data-bar-guess-tab') });

afterEach(() => {
  setCookies(null, false);
  html.removeAttribute('data-bar-guess');
  html.removeAttribute('data-bar-guess-tab');
});

describe('the guess, made again on each move', () => {
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
  });

  const moveTo = (path: string, search = '') => {
    at.path = path;
    at.search = search;
    act(() => root.render(<WorkspaceBarGuess />));
    return marks();
  };

  it('from Learn to the Agent page: no tabs guessed while Learn is the bar seen last, the Agent tab once it is not', () => {
    setCookies('learn');
    expect(moveTo('/learn')).toEqual({ shown: false, tab: null });
    expect(moveTo('/my/agent')).toEqual({ shown: false, tab: null });
    // A Learn page with no bar (a lesson) leaves the workspace's bar the one seen last.
    setCookies('contribute');
    expect(moveTo('/learn/lessons/a-lesson')).toEqual({ shown: false, tab: null });
    expect(moveTo('/my/agent')).toEqual({ shown: true, tab: 'agent' });
  });

  it("from the Agent page to Settings opened from Learn: the guess is taken away, since Learn's bar shows there", () => {
    setCookies('contribute');
    expect(moveTo('/my/agent')).toEqual({ shown: true, tab: 'agent' });
    expect(moveTo('/my/settings', 'from=learn')).toEqual({ shown: false, tab: null });
    expect(moveTo('/my/settings')).toEqual({ shown: true, tab: 'settings' });
  });

  it("a fair-use message's answer page: the tabs, none current", () => {
    setCookies('contribute');
    expect(moveTo('/contribute/answer/N_1')).toEqual({ shown: true, tab: null });
  });

  it('home to Contribute, and the landing as a visitor sees it', () => {
    setCookies('contribute');
    expect(moveTo('/')).toEqual({ shown: false, tab: null });
    expect(moveTo('/contribute')).toEqual({ shown: true, tab: 'contribute' });
    expect(moveTo('/contribute', 'as=visitor')).toEqual({ shown: false, tab: null });
  });

  it("a lesson's Start page: the tabs, none current", () => {
    setCookies('contribute');
    expect(moveTo('/my/start/acme/widgets/42')).toEqual({ shown: true, tab: 'contribute' });
    expect(moveTo('/my/start/acme/widgets/42', 'lesson=1')).toEqual({ shown: true, tab: null });
  });

  it('signed out: nothing, wherever the page is', () => {
    setCookies('contribute', false);
    expect(moveTo('/my/agent')).toEqual({ shown: false, tab: null });
  });
});

describe("the bar's place", () => {
  /** The head's script, run on `address` with the cookies set: what it leaves on `<html>`. */
  const guessFirstLoad = (address: string) => {
    window.history.replaceState(null, '', address);
    html.removeAttribute('data-bar-guess');
    html.removeAttribute('data-bar-guess-tab');
    // biome-ignore lint/security/noGlobalEval: the spec runs the inline script as the browser does.
    window.eval(BAR_GUESS_SCRIPT);
  };

  const draw = () => {
    document.body.innerHTML = renderToStaticMarkup(<WorkspaceBarFallback />);
    return {
      bar: document.querySelector('html[data-bar-guess] [data-bar-fallback]'),
      line: document.querySelector('html:not([data-bar-guess]) [data-bar-fallback-line]'),
    };
  };

  it("shows the tabs' names, the current one marked, where the head's script guessed the tabs", () => {
    setCookies('contribute');
    guessFirstLoad('/my/agent');
    const { bar, line } = draw();
    expect(bar).not.toBeNull();
    expect(line).toBeNull();
    expect(bar?.className).toContain('[html[data-bar-guess]_&]:block');
    expect([...(bar?.querySelectorAll('[data-fallback-tab]') ?? [])].map((tab) => tab.textContent)).toEqual([
      'Contribute',
      'Pull requests',
      'Agent',
      'Settings',
    ]);
    const current = document.querySelector('html[data-bar-guess-tab="agent"] [data-fallback-tab="agent"]');
    expect(current?.className).toContain('[html[data-bar-guess-tab=agent]_&]:font-semibold');
  });

  it("is the header's line alone without the guess: signed out, a visitor's landing, or Learn's bar on Settings", () => {
    for (const [address, cookies] of [
      ['/my/agent', null],
      ['/contribute?as=visitor', 'contribute'],
      ['/my/settings?from=learn', 'contribute'],
      ['/my/settings', 'learn'],
    ] as const) {
      setCookies(cookies, cookies !== null);
      guessFirstLoad(address);
      const { bar, line } = draw();
      expect(bar, address).toBeNull();
      expect(line, address).not.toBeNull();
    }
  });

  it("has the bar's height: the bar's own box and each tab's padding and edge", () => {
    document.body.innerHTML = renderToStaticMarkup(<TabsBar>{null}</TabsBar>);
    const barBox = document.body.firstElementChild?.className.split(' ').sort();
    document.body.innerHTML = renderToStaticMarkup(<WorkspaceBarFallback shown={{ current: null }} />);
    const fallback = document.querySelector('[data-bar-fallback]');
    expect(
      fallback?.className
        .split(' ')
        .filter((name) => name !== 'block')
        .sort(),
    ).toEqual(barBox);
    // The tab's box as `Tab` draws its link: the same padding, the same 2px edge, one line of text.
    for (const tab of document.querySelectorAll('[data-fallback-tab]')) {
      for (const name of [
        'inline-block',
        'whitespace-nowrap',
        'px-3',
        'pb-4',
        'sm:px-4',
        'border-b-2',
        'rounded-t-lg',
      ]) {
        expect(tab.className.split(' ')).toContain(name);
      }
    }
    // The header's line is the bar's lower edge: one line in all, shown or not.
    expect(fallback?.className.split(' ')).toContain('border-b');
  });
});
