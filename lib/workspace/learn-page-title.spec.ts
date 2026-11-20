import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('./gate.data', () => gate);

const { learnPageMetadata } = await import('./learn-page-title');

const OPEN = { kind: 'open', entered: true, agents: { hosted: false, own: true }, learnOpen: true } as const;

beforeEach(() => vi.clearAllMocks());

describe('a Learn page’s title under /my', () => {
  it('names the page to an account Learn is open to', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(OPEN);
    expect(await learnPageMetadata('Your progress')).toEqual({ title: 'Your progress' });
  });

  it('a visitor reads a plain sign-in title, never the Learn page’s name', async () => {
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    expect(await learnPageMetadata('A lesson')).toEqual({ title: 'Sign in' });
  });

  it('an account Learn is not open to, hidden, being set up, or a failed read: the site’s own title', async () => {
    for (const answer of [{ ...OPEN, learnOpen: false }, { kind: 'hidden' }, { kind: 'setting-up' }]) {
      gate.loadWorkspaceGate.mockResolvedValue(answer);
      expect(await learnPageMetadata('Goal and level')).toEqual({});
    }
    gate.loadWorkspaceGate.mockRejectedValue(new Error('down'));
    expect(await learnPageMetadata('Goal and level')).toEqual({});
  });
});
