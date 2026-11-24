import { describe, expect, it } from 'vitest';

import { keyedIssueOf, keyedPageOf, nodeIdsOf } from './masked-feed';
import { maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';
import type { ContributeIssue, ContributeIssuePage } from '@/lib/workspace/contribute.types';

const issue = (patch: Partial<ContributeIssue>) => ({ issueId: 'I_1', ...patch }) as ContributeIssue;

describe("the live feed's keys for masked rows", () => {
  it('keeps the node id, and keys a masked row without one by its mask id, set apart', () => {
    expect(keyedIssueOf(issue({})).issueId).toBe('I_1');
    expect(keyedIssueOf(issue({ masked: maskedIssue() })).issueId).toBe('I_1');
    expect(keyedIssueOf(issue({ issueId: null as never, masked: maskedIssue() })).issueId).toBe('mask:q7k2m9xa');
  });

  it('keys every row of a page, and passes a missing page on', () => {
    const page = { items: [issue({ issueId: '' as never, masked: maskedIssue() })], total: 1, next: null };
    expect(keyedPageOf(page as ContributeIssuePage).items[0].issueId).toBe('mask:q7k2m9xa');
    expect(keyedPageOf(null)).toBeNull();
    expect(keyedPageOf(undefined)).toBeUndefined();
  });

  it('asks the status poll about node ids only', () => {
    expect(nodeIdsOf(['I_1', 'mask:q7k2m9xa', 'I_2'])).toEqual(['I_1', 'I_2']);
  });
});
