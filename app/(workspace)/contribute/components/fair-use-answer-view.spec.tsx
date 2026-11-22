import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({ loadFairUseNotice: vi.fn(), loadContributeEmailSettings: vi.fn() }));
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/contribute.data', () => data);
vi.mock('@/lib/workspace/gate.data', () => gate);
vi.mock('@/lib/workspace/fair-use.actions', () => ({}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const { FairUseAnswerView } = await import('./fair-use-answer-view');
const { FairUseAnswerScreen } = await import('./fair-use-answer');
const { WorkspaceSignIn } = await import('@/components/workspace/workspace-sign-in');
const { fairUseNotice } = await import('@/lib/contribute/__fixtures__/fair-use');

beforeEach(() => {
  vi.clearAllMocks();
  gate.loadWorkspaceGate.mockResolvedValue({ kind: 'open' });
});

describe('the answer page’s reads', () => {
  it('shows the user’s own message, saying it went by email too when they have an address', async () => {
    data.loadFairUseNotice.mockResolvedValue(fairUseNotice());
    data.loadContributeEmailSettings.mockResolvedValue({ to: 'o•••@example.com' });
    const page = await FairUseAnswerView({ noticeId: '583231-outsidePr-1-1' });
    expect(data.loadFairUseNotice).toHaveBeenCalledWith('583231-outsidePr-1-1');
    expect(page.type).toBe(FairUseAnswerScreen);
    expect(page.props).toEqual({ notice: fairUseNotice(), byEmail: true });

    data.loadContributeEmailSettings.mockResolvedValue(undefined);
    expect((await FairUseAnswerView({ noticeId: '583231-outsidePr-1-1' })).props.byEmail).toBe(false);
  });

  it('asks a visitor who is not signed in to sign in, on this address, before reading anything', async () => {
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    const page = await FairUseAnswerView({ noticeId: '583231-outsidePr-1-1' });
    expect(page.type).toBe(WorkspaceSignIn);
    expect(data.loadFairUseNotice).not.toHaveBeenCalled();
  });

  it('is not found, for a signed-in viewer, for anything the API refuses, or when the viewer could not be read', async () => {
    data.loadFairUseNotice.mockResolvedValue(null);
    await expect(FairUseAnswerView({ noticeId: '583231-outsidePr-1-1' })).rejects.toThrow('NEXT_NOT_FOUND');
    gate.loadWorkspaceGate.mockRejectedValue(new Error('down'));
    await expect(FairUseAnswerView({ noticeId: '583231-outsidePr-1-1' })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
