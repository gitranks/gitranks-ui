import { describe, expect, it } from 'vitest';

import { forkSyncUrlOf } from './fork-sync';

describe('forkSyncUrlOf', () => {
  it('links the fork only for a sync refused for workflows, and only a plain owner/name', () => {
    expect(forkSyncUrlOf('sync_workflows', 'octo-cat/eslint')).toBe('https://github.com/octo-cat/eslint');
    expect(forkSyncUrlOf('branch_conflict', 'octo-cat/eslint')).toBeNull();
    expect(forkSyncUrlOf('sync_workflows', null)).toBeNull();
    expect(forkSyncUrlOf('sync_workflows', 'octo-cat/eslint/../x')).toBeNull();
    expect(forkSyncUrlOf('sync_workflows', 'evil.com?x/y')).toBeNull();
  });

  it('opens the branch the sync brings up to date: GitHub syncs only the branch its page shows', () => {
    expect(forkSyncUrlOf('sync_workflows', 'octo-cat/eslint', 'develop')).toBe(
      'https://github.com/octo-cat/eslint/tree/develop',
    );
    expect(forkSyncUrlOf('sync_workflows', 'octo-cat/eslint', 'release/v2 #1')).toBe(
      'https://github.com/octo-cat/eslint/tree/release/v2%20%231',
    );
  });
});
