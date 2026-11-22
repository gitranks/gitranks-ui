// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  forgetHeroApplication,
  HERO_APPLICATION_COOKIE,
  hasHeroApplication,
  heroApplicationLoginOf,
  rememberHeroApplication,
} from './hero-application-cookie';

afterEach(() => forgetHeroApplication());

describe('the open application note', () => {
  it('notes the login, and forgets it', () => {
    rememberHeroApplication('octocat');
    expect(document.cookie).toContain(`${HERO_APPLICATION_COOKIE}=octocat`);
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(true);
    forgetHeroApplication();
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(false);
  });

  it('answers only for the login it names, in any case', () => {
    rememberHeroApplication('OctoCat');
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(true);
    expect(hasHeroApplication(document.cookie, 'hubot')).toBe(false);
    expect(hasHeroApplication(document.cookie, undefined)).toBe(false);
  });

  it('notes nothing that is not a login, and reads nothing that is not one', () => {
    rememberHeroApplication('not a login; Path=/x');
    expect(heroApplicationLoginOf(document.cookie)).toBeNull();
    expect(heroApplicationLoginOf('a=1; hero_application=<b>; c=2')).toBeNull();
    expect(heroApplicationLoginOf('a=1; hero_application=mona; c=2')).toBe('mona');
  });
});
