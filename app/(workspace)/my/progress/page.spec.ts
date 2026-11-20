import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => gate);
vi.mock('@/components/learn/progress/progress-view', () => ({ ProgressView: () => null }));

const { generateMetadata } = await import('./page');

const OPEN = { kind: 'open', entered: true, agents: { hosted: false, own: true }, learnOpen: true } as const;

beforeEach(() => vi.clearAllMocks());

describe('Your progress: the page title', () => {
  it('names the page to an account Learn is open to', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(OPEN);
    expect(await generateMetadata()).toEqual({ title: 'Your progress' });
  });

  it('a visitor reads a plain sign-in title, never the Learn page’s name', async () => {
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    expect(await generateMetadata()).toEqual({ title: 'Sign in' });
  });

  it('an account Learn is not open to, hidden, or a failed read: the site’s own title', async () => {
    for (const answer of [{ ...OPEN, learnOpen: false }, { kind: 'hidden' }, { kind: 'setting-up' }]) {
      gate.loadWorkspaceGate.mockResolvedValue(answer);
      expect(await generateMetadata()).toEqual({});
    }
    gate.loadWorkspaceGate.mockRejectedValue(new Error('down'));
    expect(await generateMetadata()).toEqual({});
  });
});
