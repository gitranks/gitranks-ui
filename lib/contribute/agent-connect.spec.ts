import { describe, expect, it, vi } from 'vitest';

import { mcpToken } from './__fixtures__/contribute-views';
import {
  agentConnectedOf,
  agentWelcomeHref,
  forgetWelcomeOf,
  isAgentWelcome,
  replaceToken,
  unusedTokenOf,
  welcomeClientOf,
} from './agent-connect';

/** A made-up token of the real shape: `gr_` and 43 base62 characters. */
const TOKEN = 'gr_3Fh7Lk2Qw9Zx4Cv8Bn1Mt6Ry0Pu5Ja2Sd7Gf4Hk9LeW';

describe('agentConnectedOf', () => {
  it("takes the onboarded stamp for a user who was not onboarded, whatever the token's own use", () => {
    expect(agentConnectedOf({ onboardedBefore: false, onboardedAt: '2026-10-28T12:00:00Z', tokenUsedAt: null })).toBe(
      true,
    );
    expect(agentConnectedOf({ onboardedBefore: false, onboardedAt: null, tokenUsedAt: undefined })).toBe(false);
  });

  it("falls back on the token's first use when the stamp is not answered, or cannot tell", () => {
    expect(
      agentConnectedOf({ onboardedBefore: false, onboardedAt: undefined, tokenUsedAt: '2026-10-28T12:00:00Z' }),
    ).toBe(true);
    // Onboarded already (a key): the stamp is old news, the new token's use is the call.
    expect(agentConnectedOf({ onboardedBefore: true, onboardedAt: '2026-10-01T00:00:00Z', tokenUsedAt: null })).toBe(
      false,
    );
    expect(
      agentConnectedOf({ onboardedBefore: true, onboardedAt: undefined, tokenUsedAt: '2026-10-28T12:00:00Z' }),
    ).toBe(true);
  });
});

describe('replaceToken', () => {
  const created = { token: TOKEN, mcpToken: mcpToken({ id: 'T_2', last4: '9Le0' }) };

  it('revokes the token shown first, then makes another in its place', async () => {
    const order: string[] = [];
    const revoke = vi.fn(async (id: string) => {
      order.push(`revoke ${id}`);
      return { ok: true as const, data: true };
    });
    const create = vi.fn(async (name: string) => {
      order.push(`create ${name}`);
      return { ok: true as const, data: created };
    });

    expect(await replaceToken('T_1', 'Codex CLI on Linux', { revoke, create })).toEqual({ ok: true, created });
    expect(order).toEqual(['revoke T_1', 'create Codex CLI on Linux']);
  });

  it('makes nothing when the revoke fails, so the token shown stays the one live', async () => {
    const create = vi.fn();
    const result = await replaceToken('T_1', 'x', {
      revoke: async () => ({ ok: false as const, error: 'FAILED' as const }),
      create,
    });

    expect(result).toMatchObject({ ok: false, stage: 'revoke' });
    expect(create).not.toHaveBeenCalled();
  });

  it('says the old token is gone when the new one cannot be made', async () => {
    const result = await replaceToken('T_1', 'x', {
      revoke: async () => ({ ok: true as const, data: true }),
      create: async () => ({ ok: false as const, error: 'INVALID' as const, message: 'Too many tokens' }),
    });

    expect(result).toEqual({
      ok: false,
      stage: 'create',
      error: { ok: false, error: 'INVALID', message: 'Too many tokens' },
    });
  });
});

describe('the welcome', () => {
  it('goes to the overview with the client picked, which it reads back, Claude Code otherwise', () => {
    expect(agentWelcomeHref('gemini-cli')).toBe('/contribute?welcome=agent&client=gemini-cli');
    expect(isAgentWelcome('agent')).toBe(true);
    expect(isAgentWelcome(['agent'])).toBe(true);
    expect(isAgentWelcome('key')).toBe(false);
    expect(welcomeClientOf('codex')).toBe('codex');
    expect(welcomeClientOf(['cursor'])).toBe('cursor');
    expect(welcomeClientOf('<script>')).toBe('claude-code');
    expect(welcomeClientOf(undefined)).toBe('claude-code');
  });
});

describe('unusedTokenOf', () => {
  it('is the newest token the agent has not called with', () => {
    const used = mcpToken({ id: 'T_1', lastUsedAt: '2026-10-27T10:00:00Z' });
    const older = mcpToken({ id: 'T_2' });
    const newer = mcpToken({ id: 'T_3' });

    expect(unusedTokenOf([used, older, newer])?.id).toBe('T_3');
    expect(unusedTokenOf([used])).toBeUndefined();
    expect(unusedTokenOf(undefined)).toBeUndefined();
  });
});

describe('forgetWelcomeOf', () => {
  it("takes the welcome's parameters out of the address, and leaves the rest", () => {
    expect(forgetWelcomeOf('https://gitranks.com/contribute?welcome=agent&client=codex')).toBe('/contribute');
    expect(forgetWelcomeOf('https://gitranks.com/contribute?welcome=agent&as=x#top')).toBe('/contribute?as=x#top');
    expect(forgetWelcomeOf('https://gitranks.com/contribute')).toBeNull();
  });
});
