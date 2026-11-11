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
});
