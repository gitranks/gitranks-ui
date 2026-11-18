import { describe, expect, it } from 'vitest';

import { heroHitOf, heroWeekLabel, isHeroRepo } from './unsung-hero';

describe('heroWeekLabel', () => {
  it('names the week Monday to Sunday', () => {
    expect(heroWeekLabel({ startsAt: '2026-11-16T00:00:00.000Z', endsAt: '2026-11-23T00:00:00.000Z' })).toBe(
      'Nov 16 – 22',
    );
  });

  it('names both months across a month end', () => {
    expect(heroWeekLabel({ startsAt: '2026-11-30T00:00:00.000Z', endsAt: '2026-12-07T00:00:00.000Z' })).toBe(
      'Nov 30 – Dec 6',
    );
  });
});

describe('isHeroRepo', () => {
  const hero = { repo: { nameWithOwner: 'octo-labs/scroll-guard' } };

  it("is the hero's repository in any letter case, and no other", () => {
    expect(isHeroRepo(hero, 'OCTO-labs/scroll-guard')).toBe(true);
    expect(isHeroRepo(hero, 'octo-labs/scroll')).toBe(false);
    expect(isHeroRepo(null, 'octo-labs/scroll-guard')).toBe(false);
  });
});

describe('heroHitOf', () => {
  it('takes a visit and a press of Star on GitHub, and nothing else of the body', () => {
    expect(heroHitOf({ kind: 'visit', repo: 'a/b', visitorAddress: '1.2.3.4' })).toEqual({
      kind: 'visit',
      repo: 'a/b',
    });
    expect(heroHitOf({ kind: 'github', repo: 'octo-org/hello.world_2' })).toEqual({
      kind: 'github',
      repo: 'octo-org/hello.world_2',
    });
  });

  it.each([
    ['nothing', undefined],
    ['a string', 'visit'],
    ['another kind', { kind: 'star', repo: 'a/b' }],
    ['no repository', { kind: 'visit' }],
    ['a repository without an owner', { kind: 'visit', repo: 'b' }],
    ['a name over 100 characters', { kind: 'visit', repo: `a/${'b'.repeat(101)}` }],
    ['a space', { kind: 'visit', repo: 'a/b c' }],
  ])('refuses %s', (_name, body) => {
    expect(heroHitOf(body)).toBeNull();
  });
});
