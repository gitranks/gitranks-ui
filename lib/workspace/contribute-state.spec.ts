import { describe, expect, it } from 'vitest';

import {
  accessNoticesOf,
  contributeHomeOf,
  contributeNoticesOf,
  hasContributeSignIn,
  hasEitherSignIn,
  isContributePageOpen,
  isMidSetup,
  isOnboarded,
  isPaused,
  withoutAccessNotices,
} from './contribute-state';
import { contributor, limits, views } from '@/lib/contribute/__fixtures__/contribute-views';

const kinds = (view: Parameters<typeof contributeNoticesOf>[0]) => contributeNoticesOf(view).map(({ kind }) => kind);

describe('contributeNoticesOf', () => {
  it('names what stands between the user and the next attempt, most pressing first', () => {
    expect(kinds(views.newcomer)).toEqual(['no-key']);
    expect(kinds(views.noKey)).toEqual(['no-key']);
    expect(kinds(views.keyInvalid)).toEqual(['key-invalid']);
    expect(kinds(views.exhausted)).toEqual(['exhausted']);
    expect(kinds(views.limitReached)).toEqual(['limit-reached']);
    // The grant is asked for on the first review, never up front.
    expect(kinds(views.grantMissing)).toEqual([]);
    // A pause is a refused key's: the key's notice alone says it.
    expect(kinds(views.paused)).toEqual(['key-invalid']);
    expect(kinds(views.active)).toEqual([]);
  });

  it('carries the day a waiting key starts again', () => {
    expect(contributeNoticesOf(views.exhausted)[0]).toEqual({ kind: 'exhausted', until: '2026-11-14T00:00:00.000Z' });
  });

  it('reads the pause from the status', () => {
    expect(kinds(views.fieldsMissing)).toEqual([]);
    expect(isPaused(views.paused)).toBe(true);
    expect(isPaused(views.active)).toBe(false);
  });
});

describe('accessNoticesOf', () => {
  it('names a suspended account', () => {
    expect(accessNoticesOf(views.suspended)).toEqual([{ kind: 'suspended' }]);
  });

  it('says nothing at the standard level, or while the limits are not answered', () => {
    expect(accessNoticesOf({ ...views.active, contributor: contributor({ limits: limits.standard }) })).toEqual([]);
    expect(accessNoticesOf(views.active)).toEqual([]);
  });

  it('puts a suspension first, before what the key needs', () => {
    const suspendedNoKey = { ...views.noKey, contributor: { ...views.noKey.contributor, limits: limits.suspended } };
    expect(kinds(suspendedNoKey)).toEqual(['suspended', 'no-key']);
    expect(withoutAccessNotices(contributeNoticesOf(suspendedNoKey)).map(({ kind }) => kind)).toEqual(['no-key']);
  });
});

describe('isOnboarded', () => {
  it('is the onboarded stamp, and nothing else', () => {
    expect(isOnboarded(views.active)).toBe(true);
    expect(isOnboarded(views.agentOnboarded)).toBe(true);
    // Onboarded once stays onboarded, the key removed and the tokens revoked.
    expect(isOnboarded(views.onboardedNoPath)).toBe(true);

    expect(isOnboarded(views.noKey)).toBe(false);
    // A token created and never used is setup, not onboarding.
    expect(isOnboarded(views.midSetup)).toBe(false);
    expect(isOnboarded(views.newcomer)).toBe(false);
    expect(isOnboarded(null)).toBe(false);
  });

  it('is guessed from what the user set up while the API does not answer the stamp', () => {
    const missing = views.onboardingMissing;
    // A stored Claude key.
    expect(isOnboarded(missing)).toBe(true);

    const nothingSetUp = { ...missing, contributor: { ...missing.contributor!, credentials: [], plan: null } };
    expect(isOnboarded(nothingSetUp)).toBe(false);
    expect(isOnboarded({ ...nothingSetUp, contributor: { ...nothingSetUp.contributor, plan: 'MAX_5X' } })).toBe(true);

    const token = { ...views.midSetup.ownAgent!.tokens[0], lastUsedAt: null };
    const unused = { ...nothingSetUp, ownAgent: { paths: { hosted: false, mcp: true }, tokens: [token] } };
    expect(isOnboarded(unused)).toBe(false);
    const used = {
      ...unused,
      ownAgent: { ...unused.ownAgent, tokens: [{ ...token, lastUsedAt: '2026-10-30T09:00:00.000Z' }] },
    };
    expect(isOnboarded(used)).toBe(true);
  });
});

describe('isMidSetup', () => {
  it('is a live token and no stamp yet', () => {
    expect(isMidSetup(views.midSetup)).toBe(true);
    expect(isMidSetup(views.noKey)).toBe(false);
    expect(isMidSetup(views.agentOnboarded)).toBe(false);
    expect(isMidSetup(views.newcomer)).toBe(false);
  });
});

const AT = '2026-11-25T09:00:00.000Z';

/**
 * A person in each state of the signs, set up under the rule from before them (`onboardedAt` set) or not: none, the
 * Contribute sign only, the Learn sign only, both, and the signs not known.
 */
const signed = (
  contributeOnboardedAt: string | null | undefined,
  learnOnboardedAt: string | null | undefined,
  onboardedAt: string | null = AT,
) => ({ ...views.active, contributor: contributor({ contributeOnboardedAt, learnOnboardedAt, onboardedAt }) });
const SIGNED = {
  none: signed(null, null),
  contribute: signed(AT, null, null),
  learn: signed(null, AT),
  both: signed(AT, AT),
  unknown: signed(undefined, undefined, null),
  unknownSetUp: signed(undefined, undefined),
};

describe('the signs, read from the view', () => {
  it.each<[keyof typeof SIGNED, boolean, boolean]>([
    ['none', false, false],
    ['contribute', true, true],
    ['learn', false, true],
    ['both', true, true],
    ['unknown', false, true],
    ['unknownSetUp', true, true],
  ])('%s: the Contribute sign %s, either sign %s', (state, contribute, either) => {
    expect(hasContributeSignIn(SIGNED[state])).toBe(contribute);
    expect(hasEitherSignIn(SIGNED[state])).toBe(either);
  });

  it('is neither sign for a visitor or someone with no contributor row', () => {
    expect(hasContributeSignIn(null)).toBe(false);
    expect(hasEitherSignIn(null)).toBe(false);
    expect(hasEitherSignIn(views.newcomer)).toBe(false);
  });
});

describe('contributeHomeOf', () => {
  it('is the landing without the Contribute sign, a learner too, then Contribute home', () => {
    const landing = { screen: 'landing', viewer: 'signed-in', preview: false };
    expect(contributeHomeOf(views.newcomer, {})).toEqual(landing);
    expect(contributeHomeOf(SIGNED.none, {})).toEqual(landing);
    expect(contributeHomeOf(SIGNED.learn, {})).toEqual(landing);
    expect(contributeHomeOf(SIGNED.unknown, {})).toEqual(landing);
    expect(contributeHomeOf(views.midSetup, {})).toEqual(landing);
    expect(contributeHomeOf(SIGNED.contribute, {})).toEqual({ screen: 'tab' });
    expect(contributeHomeOf(SIGNED.both, {})).toEqual({ screen: 'tab' });
    // Not known: the rule from before the sign keeps a person who was in on Contribute home.
    expect(contributeHomeOf(SIGNED.unknownSetUp, {})).toEqual({ screen: 'tab' });
  });

  it("shows anyone the visitor's landing under ?as=visitor", () => {
    const visitor = { screen: 'landing', viewer: 'visitor', preview: true };

    expect(contributeHomeOf(views.active, { as: 'visitor' })).toEqual(visitor);
    expect(contributeHomeOf(views.midSetup, { as: ['visitor'] })).toEqual(visitor);
    expect(contributeHomeOf(views.active, { as: 'someone' })).toEqual({ screen: 'tab' });
  });
});

describe('isContributePageOpen', () => {
  it('opens the runs, the pull requests and a pull request with either sign: Learn fixes have them too', () => {
    for (const page of ['issues', 'me', 'runs', 'attempt'] as const) {
      for (const state of ['contribute', 'learn', 'both', 'unknown', 'unknownSetUp'] as const) {
        expect(isContributePageOpen(SIGNED[state], page), `${page} ${state}`).toBe(true);
      }
      expect(isContributePageOpen(SIGNED.none, page)).toBe(false);
      expect(isContributePageOpen(views.newcomer, page)).toBe(false);
    }
  });

  it('opens Settings to any contributor, so one mid-setup can revoke a token or delete their data', () => {
    expect(isContributePageOpen(views.active, 'settings')).toBe(true);
    expect(isContributePageOpen(views.midSetup, 'settings')).toBe(true);
    expect(isContributePageOpen(views.noKey, 'settings')).toBe(true);
    expect(isContributePageOpen(SIGNED.none, 'settings')).toBe(true);
    expect(isContributePageOpen(views.newcomer, 'settings')).toBe(false);
  });
});
