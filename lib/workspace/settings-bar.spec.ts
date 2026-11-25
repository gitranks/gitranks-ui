// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isSharedSettingsPath,
  LAST_BAR_COOKIE,
  lastBarCookieOf,
  lastBarInCookies,
  lastBarOf,
  learnOwnsPage,
  rememberBar,
  settingsBarOf,
} from './settings-bar';

const clear = () => {
  // biome-ignore lint/suspicious/noDocumentCookie: the spec clears the one cookie it set.
  document.cookie = `${LAST_BAR_COOKIE}=; Path=/; Max-Age=0`;
};

describe('the bar Settings shows', () => {
  afterEach(clear);

  it("is Learn's when Learn's link opened it", () => {
    const base = { lastBar: 'contribute', audience: 'both' } as const;
    expect(settingsBarOf({ ...base, from: 'learn' })).toBe('learn');
    expect(settingsBarOf({ ...base, from: ['learn', 'contribute'] })).toBe('learn');
  });

  it('else the bar seen last, else the product the person uses', () => {
    expect(settingsBarOf({ from: null, lastBar: 'learn', audience: 'contributor' })).toBe('learn');
    expect(settingsBarOf({ from: 'other', lastBar: 'contribute', audience: 'learner' })).toBe('contribute');
    expect(settingsBarOf({ from: undefined, lastBar: null, audience: 'learner' })).toBe('learn');
    expect(settingsBarOf({ from: undefined, lastBar: null, audience: 'both' })).toBe('contribute');
  });

  it('applies to Settings and its own pages only', () => {
    expect(isSharedSettingsPath('/my/settings')).toBe(true);
    expect(isSharedSettingsPath('/my/settings/github')).toBe(true);
    expect(isSharedSettingsPath('/my/settingsx')).toBe(false);
    expect(isSharedSettingsPath('/my/pull-requests')).toBe(false);
  });

  it('keeps the bar seen last in a cookie, and reads only a known value back', () => {
    expect(lastBarInCookies(document.cookie)).toBeNull();
    rememberBar('learn');
    expect(lastBarInCookies(document.cookie)).toBe('learn');
    rememberBar('contribute');
    expect(lastBarInCookies(`other=1; ${LAST_BAR_COOKIE}=contribute`)).toBe('contribute');
    expect(lastBarInCookies(document.cookie)).toBe('contribute');
    expect(lastBarOf('admin')).toBeNull();
    expect(lastBarOf(undefined)).toBeNull();
    expect(lastBarInCookies(`${LAST_BAR_COOKIE}=admin`)).toBeNull();
  });

  it('writes the cookie again on every page with a bar, for a year, Secure over HTTPS', () => {
    const writes: string[] = [];
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
    const spy = vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
      writes.push(value);
      cookie.set!.call(document, value);
    });
    rememberBar('learn');
    rememberBar('learn');
    expect(writes).toEqual([
      'gr_last_bar=learn; Path=/; Max-Age=31536000; SameSite=Lax',
      'gr_last_bar=learn; Path=/; Max-Age=31536000; SameSite=Lax',
    ]);
    spy.mockRestore();
    vi.stubGlobal('location', { protocol: 'https:' });
    expect(lastBarCookieOf('contribute')).toBe(
      'gr_last_bar=contribute; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    );
    vi.unstubAllGlobals();
  });
});

describe('the pages Learn owns', () => {
  const owns = (pathname: string, search = '') => learnOwnsPage(pathname, new URLSearchParams(search));

  it("are a lesson's Start page and every page Learn opened", () => {
    expect(owns('/my/start/acme/widgets/42', 'lesson=1')).toBe(true);
    expect(owns('/my/start/acme/widgets/42', 'lesson=1&from=contribute')).toBe(true);
    // Learn's "Pull requests", a pull request and an issue's page, opened from Learn.
    expect(owns('/my/pull-requests', 'from=learn')).toBe(true);
    expect(owns('/my/pull-requests/acme/widgets/42', 'from=learn')).toBe(true);
    expect(owns('/my/issues/M_1', 'from=learn')).toBe(true);
    expect(owns('/my/settings', 'from=learn')).toBe(true);
  });

  it("are none of the workspace's own pages", () => {
    expect(owns('/contribute')).toBe(false);
    expect(owns('/my/start/acme/widgets/42')).toBe(false);
    expect(owns('/my/start/acme/widgets/42', 'from=contribute')).toBe(false);
    expect(owns('/my/pull-requests')).toBe(false);
    expect(owns('/my/issues/M_1', 'from=contribute')).toBe(false);
    expect(owns('/my/agent')).toBe(false);
    expect(owns('/my/settings')).toBe(false);
    // `lesson` names a lesson only on a Start page.
    expect(owns('/my/pull-requests', 'lesson=1')).toBe(false);
  });
});
