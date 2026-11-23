// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  isSharedSettingsPath,
  LAST_BAR_COOKIE,
  lastBarInCookies,
  lastBarOf,
  rememberBar,
  settingsBarOf,
} from './settings-bar';

const clear = () => {
  // biome-ignore lint/suspicious/noDocumentCookie: the spec clears the one cookie it set.
  document.cookie = `${LAST_BAR_COOKIE}=; Path=/; Max-Age=0`;
};

describe('the bar Settings shows', () => {
  afterEach(clear);

  it("is Learn's when Learn's link opened it, and only where Learn is open", () => {
    const base = { lastBar: 'contribute', audience: 'both', learnOpen: true } as const;
    expect(settingsBarOf({ ...base, from: 'learn' })).toBe('learn');
    expect(settingsBarOf({ ...base, from: ['learn', 'contribute'] })).toBe('learn');
    expect(settingsBarOf({ ...base, from: 'learn', learnOpen: false })).toBe('contribute');
  });

  it('else the bar seen last, else the product the person uses', () => {
    expect(settingsBarOf({ from: null, lastBar: 'learn', audience: 'contributor', learnOpen: true })).toBe('learn');
    expect(settingsBarOf({ from: 'other', lastBar: 'contribute', audience: 'learner', learnOpen: true })).toBe(
      'contribute',
    );
    expect(settingsBarOf({ from: undefined, lastBar: null, audience: 'learner', learnOpen: true })).toBe('learn');
    expect(settingsBarOf({ from: undefined, lastBar: null, audience: 'both', learnOpen: true })).toBe('contribute');
    expect(settingsBarOf({ from: undefined, lastBar: 'learn', audience: 'learner', learnOpen: false })).toBe(
      'contribute',
    );
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
});
