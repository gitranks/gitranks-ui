import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('./gate.data', () => gate);

const { learnPageMetadata } = await import('./learn-page-title');

const OPEN = { kind: 'open', entered: true, agents: { hosted: false, own: true } } as const;

beforeEach(() => vi.clearAllMocks());

describe('a Learn page’s title under /my', () => {
  it('names the page to an account the workspace is open to', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(OPEN);
    expect(await learnPageMetadata('Your progress')).toEqual({ title: 'Your progress' });
  });

  it('a visitor reads a plain sign-in title, never the Learn page’s name', async () => {
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    expect(await learnPageMetadata('A lesson')).toEqual({ title: 'Sign in' });
  });

  it('hidden, being set up, or a failed read: the site’s own title', async () => {
    for (const answer of [{ kind: 'hidden' }, { kind: 'setting-up' }]) {
      gate.loadWorkspaceGate.mockResolvedValue(answer);
      expect(await learnPageMetadata('Goal and level')).toEqual({});
    }
    gate.loadWorkspaceGate.mockRejectedValue(new Error('down'));
    expect(await learnPageMetadata('Goal and level')).toEqual({});
  });
});
