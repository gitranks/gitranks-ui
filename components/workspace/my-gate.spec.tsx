import { isValidElement, type ReactElement, Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadWorkspaceGate, notFound, redirect } = vi.hoisted(() => ({
  loadWorkspaceGate: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound, redirect }));
vi.mock('@/lib/workspace/gate.data', () => ({ loadWorkspaceGate }));
vi.mock('@/components/workspace/workspace-sign-in', () => ({ WorkspaceSignIn: () => null }));

const { MyGate, MyGateRead } = await import('./my-gate');
const { WorkspaceSignIn } = await import('@/components/workspace/workspace-sign-in');
const { ContributePageSkeleton } = await import('@/components/workspace/page-skeleton');
const { WORKSPACE_PATHS } = await import('@/lib/workspace/paths');

const OPEN = { kind: 'open', signs: { contribute: true, learn: null }, agents: { hosted: false, own: true } };
const page = <section data-page="" />;
const readFor = () => MyGateRead({ children: page });

beforeEach(() => {
  loadWorkspaceGate.mockReset();
  notFound.mockClear();
  redirect.mockClear();
});

describe('the gate of the pages under /my', () => {
  it("draws the page's skeleton until the person is read", () => {
    const gate = MyGate({ children: page }) as ReactElement<{ fallback: ReactElement; children: ReactElement }>;
    expect(gate.type).toBe(Suspense);
    const skeleton = (gate.props.fallback as ReactElement<{ children: ReactElement }>).props.children;
    expect(skeleton.type).toBe(ContributePageSkeleton);
    expect(gate.props.children.type).toBe(MyGateRead);
  });

  it('draws the page for someone the workspace is open to', async () => {
    loadWorkspaceGate.mockResolvedValue(OPEN);
    expect(await readFor()).toBe(page);
  });

  it('asks a visitor without a session to sign in, in place of the page', async () => {
    loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    const shown = (await readFor()) as ReactElement<{ children: ReactElement }>;
    expect(isValidElement(shown) && shown.type).toBe('main');
    expect(shown.props.children.type).toBe(WorkspaceSignIn);
  });

  it('answers 404 to an account the workspace is not open to', async () => {
    loadWorkspaceGate.mockResolvedValue({ kind: 'hidden' });
    await expect(readFor()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("sends an account being set up to Contribute's home", async () => {
    loadWorkspaceGate.mockResolvedValue({ kind: 'setting-up' });
    await expect(readFor()).rejects.toThrow(`NEXT_REDIRECT ${WORKSPACE_PATHS.contribute}`);
  });

  it('leaves an outage to the page, never a 404', async () => {
    loadWorkspaceGate.mockRejectedValue(new Error('down'));
    expect(await readFor()).toBe(page);
    expect(notFound).not.toHaveBeenCalled();
  });
});
