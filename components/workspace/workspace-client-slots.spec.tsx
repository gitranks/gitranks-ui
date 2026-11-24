import { describe, expect, it, vi } from 'vitest';

const { loadWorkspaceGate } = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => ({ loadWorkspaceGate }));
vi.mock('@/lib/workspace/actions', () => ({ setContributeEmailSettings: vi.fn() }));

const { WorkspaceClientSlots } = await import('./workspace-client-slots');
const { TimeZoneNote } = await import('./time-zone-note');

const open = { kind: 'open', entered: true, agents: { hosted: false, own: true } };

describe('the workspace client slots', () => {
  it('mount the time zone note only for an account the workspace is open to', async () => {
    loadWorkspaceGate.mockResolvedValueOnce(open);
    expect((await WorkspaceClientSlots())?.type).toBe(TimeZoneNote);
    loadWorkspaceGate.mockResolvedValueOnce({ ...open, entered: false });
    expect((await WorkspaceClientSlots())?.type).toBe(TimeZoneNote);
  });

  it.each([
    ['a visitor', { kind: 'signed-out' }],
    ['a hidden account', { kind: 'hidden' }],
    ['an account being set up', { kind: 'setting-up' }],
  ])('mount nothing for %s', async (_, gate) => {
    loadWorkspaceGate.mockResolvedValueOnce(gate);
    expect(await WorkspaceClientSlots()).toBeNull();
  });

  it('mount nothing when the gate cannot be read', async () => {
    loadWorkspaceGate.mockRejectedValueOnce(new Error('GraphQL error! 502'));
    expect(await WorkspaceClientSlots()).toBeNull();
  });
});
