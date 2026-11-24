import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { WorkspaceGate } from '@/lib/workspace/gate';

const { loadWorkspaceGate } = vi.hoisted(() => ({
  loadWorkspaceGate: vi.fn(async (): Promise<WorkspaceGate> => ({ kind: 'signed-out' })),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('@/lib/workspace/gate.data', () => ({ loadWorkspaceGate }));
vi.mock('@/app/(workspace)/learn/components/learn-tab-view', () => ({ LearnTab: () => null }));
vi.mock('@/components/workspace/workspace-sign-in', () => ({ WorkspaceSignIn: () => null }));

const { default: LearnEarlierPage, metadata } = await import('./page');
const { LearnTab } = await import('@/app/(workspace)/learn/components/learn-tab-view');
const { WorkspaceSignIn } = await import('@/components/workspace/workspace-sign-in');

/** The page's one read, inside its Suspense. */
const readOf = async () => {
  const page = LearnEarlierPage() as ReactElement<{ children: ReactElement }>;
  const inner = page.props.children;
  return (inner.type as () => Promise<unknown>)();
};

const OPEN: WorkspaceGate = { kind: 'open', entered: true, agents: { hosted: false, own: true } };

describe("today's Learn at /learn/earlier", () => {
  it('is never indexed, and named for what it does', () => {
    expect(metadata).toEqual({ title: 'Fix a real issue with your agent', robots: { index: false, follow: false } });
  });

  it('asks a visitor to sign in', async () => {
    loadWorkspaceGate.mockResolvedValueOnce({ kind: 'signed-out' });
    const shown = (await readOf()) as ReactElement<{ children: ReactElement }>;
    expect(isValidElement(shown.props.children) && shown.props.children.type).toBe(WorkspaceSignIn);
  });

  it('is not found to an account the workspace is not open to, and sends one being set up home', async () => {
    loadWorkspaceGate.mockResolvedValueOnce({ kind: 'hidden' });
    await expect(readOf()).rejects.toThrow('NEXT_NOT_FOUND');
    loadWorkspaceGate.mockResolvedValueOnce({ kind: 'setting-up' });
    await expect(readOf()).rejects.toThrow('NEXT_REDIRECT /contribute');
  });

  it("is today's Learn tab for a signed-in account", async () => {
    loadWorkspaceGate.mockResolvedValueOnce(OPEN);
    const shown = await readOf();
    expect(isValidElement(shown) && shown.type).toBe(LearnTab);
  });
});
