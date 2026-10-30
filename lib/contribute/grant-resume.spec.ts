import { describe, expect, it, vi } from 'vitest';

import {
  type PendingApproval,
  resumeHrefOf,
  savePendingApproval,
  sendPendingApproval,
  tabStoreOf,
  takePendingApproval,
} from './grant-resume';

const storeOf = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
};

const approval: PendingApproval = { attemptId: 'A_1', title: 'Fix it', body: 'Fixes #1', dco: true, nonce: 'n-1' };

describe('the approval kept for the way back from GitHub', () => {
  it('comes back once, for its attempt and its nonce', () => {
    const store = storeOf();
    expect(savePendingApproval(store, approval)).toBe(true);

    expect(takePendingApproval(store, 'A_1', 'n-1')).toEqual(approval);
    expect(takePendingApproval(store, 'A_1', 'n-1')).toBeNull();
  });

  it('approves nothing for a resume the tab did not store, and keeps what it did', () => {
    const store = storeOf();
    savePendingApproval(store, approval);

    expect(takePendingApproval(store, 'A_1', 'someone-elses')).toBeNull();
    expect(takePendingApproval(store, 'A_2', 'n-1')).toBeNull();
    expect(takePendingApproval(store, 'A_1', null)).toBeNull();
    expect(takePendingApproval(storeOf(), 'A_1', 'n-1')).toBeNull();
    expect(takePendingApproval(store, 'A_1', 'n-1')).toEqual(approval);
  });

  it('reads nothing from a stored row that is not one, and says when the tab cannot keep it', () => {
    const store = storeOf();
    store.items.set('gitranks:contribute:pending-approval', '{"attemptId":"A_1","nonce":"n-1"}');
    expect(takePendingApproval(store, 'A_1', 'n-1')).toBeNull();
    store.items.set('gitranks:contribute:pending-approval', 'not json');
    expect(takePendingApproval(store, 'A_1', 'n-1')).toBeNull();

    const full = {
      ...storeOf(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(savePendingApproval(full, approval)).toBe(false);
  });

  it('reads a blocked storage as none, so Continue says so and a resume approves nothing, never throwing', () => {
    // With site data blocked, reading `window.sessionStorage` itself throws a SecurityError.
    const blocked = {
      get sessionStorage(): Storage {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    };
    const store = tabStoreOf(blocked);

    expect(store).toBeNull();
    expect(savePendingApproval(store, approval)).toBe(false);
    expect(takePendingApproval(store, 'A_1', 'n-1')).toBeNull();
    expect(tabStoreOf(undefined)).toBeNull();

    const kept = storeOf();
    expect(tabStoreOf({ sessionStorage: kept })).toBe(kept);
  });

  it('sends GitHub back to the review with the nonce', () => {
    expect(resumeHrefOf('A_1', 'n 1')).toBe('/contribute/attempts/A_1?resume=n%201');
  });
});

describe('sending the kept approval', () => {
  it('sends the title and body the user left, and says nothing once it is through', async () => {
    const approve = vi.fn().mockResolvedValue({ ok: true });

    await expect(sendPendingApproval(approval, approve)).resolves.toBeNull();
    expect(approve).toHaveBeenCalledWith({ id: 'A_1', title: 'Fix it', body: 'Fixes #1', dco: true });
  });

  it("says the API's refusal", async () => {
    const approve = vi
      .fn()
      .mockResolvedValue({ ok: false, error: 'INVALID', message: 'Give the pull request a title.' });

    await expect(sendPendingApproval(approval, approve)).resolves.toBe('Give the pull request a title.');
  });

  it('turns a failed send into a message, so the form never stays on "Opening your PR…"', async () => {
    const approve = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(sendPendingApproval(approval, approve)).resolves.toContain('the connection failed');
  });
});
