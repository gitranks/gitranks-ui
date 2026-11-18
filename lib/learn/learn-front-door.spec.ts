import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { jar, everyone } = vi.hoisted(() => ({
  jar: { names: [] as string[] },
  everyone: vi.fn(async () => false),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => jar.names.map((name) => ({ name })) }) }));
vi.mock('./learn-everyone', () => ({ learnOpenToEveryone: everyone }));

const { learnFrontDoorOpenToVisitor } = await import('./learn-front-door');

describe("the front door's visitor version", () => {
  beforeEach(() => {
    everyone.mockReset();
    everyone.mockResolvedValue(false);
  });

  it('trusts the proxy for a visitor without a session cookie, asking nothing', async () => {
    jar.names = ['other'];
    expect(await learnFrontDoorOpenToVisitor()).toBe(true);
    expect(everyone).not.toHaveBeenCalled();
  });

  it('asks for a session cookie that signs nobody in, which the proxy let through unasked', async () => {
    for (const name of ['authjs.session-token', '__Secure-authjs.session-token.0']) {
      jar.names = [name];
      expect(await learnFrontDoorOpenToVisitor(), name).toBe(false);
    }
    everyone.mockResolvedValue(true);
    expect(await learnFrontDoorOpenToVisitor()).toBe(true);
  });
});
