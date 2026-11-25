import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { learnSignFrom, learnSignOf, learnSignOfAnswer } = await import('./learn-sign');
const { loadLearnSign } = await import('./learn-sign.data');

const AT = '2026-11-25T10:00:00.000Z';

beforeEach(() => graphqlDirect.mockReset());

describe('the Learn sign', () => {
  it('is set by a stamp, not set without one, and not known for anything else', () => {
    expect(learnSignOf(AT)).toBe(true);
    expect(learnSignOf(null)).toBe(false);
    expect(learnSignOf(undefined)).toBeNull();
    expect(learnSignOf(42)).toBeNull();
  });

  it('is not set for an account with no contributor row yet', () => {
    expect(learnSignOfAnswer({ contributor: null })).toBe(false);
  });

  it('is not known without the Contribute data, or without the stamp', () => {
    expect(learnSignOfAnswer(null)).toBeNull();
    expect(learnSignOfAnswer(undefined)).toBeNull();
    expect(learnSignOfAnswer({})).toBeNull();
    expect(learnSignOfAnswer({ contributor: {} })).toBeNull();
  });

  it("reads the contributor's stamp", () => {
    expect(learnSignOfAnswer({ contributor: { learnOnboardedAt: AT } })).toBe(true);
    expect(learnSignOfAnswer({ contributor: { learnOnboardedAt: null } })).toBe(false);
  });

  it("is read back from Learn's routes only as a boolean", () => {
    expect(learnSignFrom(true)).toBe(true);
    expect(learnSignFrom(false)).toBe(false);
    expect(learnSignFrom(null)).toBeNull();
    expect(learnSignFrom('true')).toBeNull();
  });
});

describe("the Learn sign's read", () => {
  it("is false for a new account the API answers with no contributor row, as the session's user", async () => {
    graphqlDirect.mockResolvedValue({ contribute: { contributor: null } });
    expect(await loadLearnSign('octocat')).toBe(false);
    expect(graphqlDirect).toHaveBeenCalledWith(expect.anything(), undefined, { source: 'ssr', githubLogin: 'octocat' });
  });

  it('is not known when the read throws, or answers no Contribute data', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnSign('octocat')).toBeNull();
    graphqlDirect.mockResolvedValueOnce({ contribute: null });
    expect(await loadLearnSign('octocat')).toBeNull();
  });

  it('answers the stamp', async () => {
    graphqlDirect.mockResolvedValueOnce({
      contribute: { contributor: { contributeOnboardedAt: null, learnOnboardedAt: AT } },
    });
    expect(await loadLearnSign('octocat')).toBe(true);
  });
});
