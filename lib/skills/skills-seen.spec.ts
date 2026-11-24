import { describe, expect, it } from 'vitest';

import { SKILLS_SEEN_COOKIE, SKILLS_SEEN_MAX_AGE, skillsSeenCookieOptions, tabNewOf } from './skills-seen';

describe("the Skills tab's New mark", () => {
  it('holds while the API says so and this browser has not opened the tab', () => {
    expect(tabNewOf(true, undefined)).toBe(true);
    expect(tabNewOf(true, '1')).toBe(false);
    expect(tabNewOf(false, undefined)).toBe(false);
    expect(tabNewOf(true, 'other')).toBe(true);
  });

  it('is kept in a first-party cookie for a year, out of scripts’ reach, Secure outside a local server', () => {
    expect(SKILLS_SEEN_COOKIE).toBe('skills_seen');
    expect(SKILLS_SEEN_MAX_AGE).toBe(31_536_000);
    expect(skillsSeenCookieOptions(true)).toEqual({
      path: '/',
      maxAge: SKILLS_SEEN_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
    });
    expect(skillsSeenCookieOptions(false).secure).toBe(false);
  });
});
