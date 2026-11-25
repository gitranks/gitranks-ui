// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import type { WorkspaceTab } from './gate';
import { BAR_GUESS_SCRIPT, markBarGuess, workspaceBarGuessOf } from './workspace-bar-guess';

/** A browser that holds a session and saw the workspace's tabs last. */
const MEMBER = 'has-session=1; gr_last_bar=contribute';

/** Each address of the bar, with what the guess answers for a member: the current tab, or no tabs at all. */
const ADDRESSES: [address: string, guess: WorkspaceTab | null | 'none'][] = [
  ['/contribute', 'contribute'],
  ['/contribute/', 'contribute'],
  // The landing as a visitor sees it: no tabs.
  ['/contribute?as=visitor', 'none'],
  ['/contribute?as=other', 'contribute'],
  ['/contribute/answer/N_1', null],
  ['/my/pull-requests', 'pull-requests'],
  ['/my/pull-requests/acme/widgets/42', 'pull-requests'],
  ['/my/pull-requests/by-attempt/A_1', 'pull-requests'],
  // Learn's "Pull requests" and an issue's page opened from Learn draw the workspace's tabs.
  ['/my/pull-requests?from=learn', 'pull-requests'],
  ['/my/issues/M_1?from=learn', null],
  ['/my/issues/M_1', null],
  ['/my/agent', 'agent'],
  ['/my/agent/connect?token=t', 'agent'],
  ['/my/settings', 'settings'],
  ['/my/settings/github', 'settings'],
  // Settings opened from Learn shows Learn's bar.
  ['/my/settings?from=learn', 'none'],
  ['/my/settings/work?from=learn', 'none'],
  ['/my/start/acme/widgets/42', 'contribute'],
  // A lesson's Start page: the four tabs, none current.
  ['/my/start/acme/widgets/42?lesson=1', null],
  // The player's pages under /my draw no bar.
  ['/my/pull-requests/acme/widgets/42/approve', 'none'],
  ['/my/pull-requests/acme/widgets/42/walkthrough', 'none'],
  // Pages with no workspace bar.
  ['/', 'none'],
  ['/learn', 'none'],
  ['/learn/progress', 'none'],
  ['/contribute/about', 'none'],
  ['/contribute/start', 'none'],
  ['/contribute/start/agent/own', 'none'],
  ['/contribute/maintainers', 'none'],
  ['/myself', 'none'],
];

const expected = (guess: WorkspaceTab | null | 'none') => (guess === 'none' ? null : { tab: guess });

const guessAt = (address: string, cookies: string) => {
  const url = new URL(address, 'https://gitranks.test');
  return workspaceBarGuessOf(url.pathname, url.searchParams, cookies);
};

const root = document.documentElement;

/** The head's script, run on `address` with `cookies`: the two attributes it leaves on `<html>`. */
function runScript(address: string, cookies: string) {
  root.removeAttribute('data-bar-guess');
  root.removeAttribute('data-bar-guess-tab');
  window.history.replaceState(null, '', address);
  const jar = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  Object.defineProperty(document, 'cookie', { configurable: true, get: () => cookies });
  try {
    // biome-ignore lint/security/noGlobalEval: the spec runs the inline script as the browser does.
    window.eval(BAR_GUESS_SCRIPT);
  } finally {
    if (jar) Object.defineProperty(document, 'cookie', jar);
  }
  return { shown: root.hasAttribute('data-bar-guess'), tab: root.getAttribute('data-bar-guess-tab') };
}

afterEach(() => {
  root.removeAttribute('data-bar-guess');
  root.removeAttribute('data-bar-guess-tab');
  window.history.replaceState(null, '', '/');
});

describe("the guess of the workspace's bar", () => {
  it.each(ADDRESSES)('for a member at %s: %s', (address, guess) => {
    expect(guessAt(address, MEMBER)).toEqual(expected(guess));
  });

  it("says no without the session hint, or when the bar seen last is not the workspace's", () => {
    for (const cookies of [
      'gr_last_bar=contribute',
      'has-session=1',
      'has-session=1; gr_last_bar=learn',
      'has-session=1; gr_last_bar=admin',
      '',
    ]) {
      for (const [address] of ADDRESSES) expect(guessAt(address, cookies), `${address} ${cookies}`).toBeNull();
    }
  });

  it('reads the cookies in any order, the first bar seen last only', () => {
    expect(guessAt('/my/agent', 'gr_last_bar=contribute; other=1; has-session=1')).toEqual({ tab: 'agent' });
    expect(guessAt('/my/agent', 'has-session=1; gr_last_bar=learn; gr_last_bar=contribute')).toBeNull();
  });
});

describe("the head's script", () => {
  it.each(ADDRESSES)('answers as the helper at %s', (address, guess) => {
    const want = expected(guess);
    expect(runScript(address, MEMBER)).toEqual({ shown: !!want, tab: want?.tab ?? null });
  });

  it('answers as the helper for every pair of cookies', () => {
    for (const cookies of [
      'has-session=1; gr_last_bar=learn',
      'gr_last_bar=contribute',
      'gr_last_bar=contribute; other=1; has-session=1',
      'has-session=1; gr_last_bar=learn; gr_last_bar=contribute',
      'has-session=1;gr_last_bar=contribute',
    ]) {
      for (const [address] of ADDRESSES) {
        const want = guessAt(address, cookies);
        expect(runScript(address, cookies), `${address} ${cookies}`).toEqual({
          shown: !!want,
          tab: want?.tab ?? null,
        });
      }
    }
  });

  it('never throws, and sets nothing, when the cookies cannot be read', () => {
    window.history.replaceState(null, '', '/my/agent');
    const jar = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
    });
    try {
      // biome-ignore lint/security/noGlobalEval: the spec runs the inline script as the browser does.
      expect(() => window.eval(BAR_GUESS_SCRIPT)).not.toThrow();
    } finally {
      if (jar) Object.defineProperty(document, 'cookie', jar);
    }
    expect(root.hasAttribute('data-bar-guess')).toBe(false);
  });
});

describe('marking the guess', () => {
  it('sets both attributes, then takes them away', () => {
    markBarGuess(root, { tab: 'settings' });
    expect(root.getAttribute('data-bar-guess')).toBe('');
    expect(root.getAttribute('data-bar-guess-tab')).toBe('settings');
    markBarGuess(root, { tab: null });
    expect(root.hasAttribute('data-bar-guess')).toBe(true);
    expect(root.hasAttribute('data-bar-guess-tab')).toBe(false);
    markBarGuess(root, null);
    expect(root.hasAttribute('data-bar-guess')).toBe(false);
  });
});
