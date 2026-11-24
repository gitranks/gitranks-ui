import { describe, expect, it } from 'vitest';

import { issue } from './__fixtures__/contribute-overview';
import { keyedIssueOf, keyedPageOf, nodeIdsOf } from './masked-feed';
import { maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';
import type { ContributeIssueAnswer } from '@/lib/workspace/contribute.types';

/** What names the fixture's issue: none of it may be left on a masked row. */
const NAMING = ['I_1', 'R_1', 'quill-rs', '1204', 'Panic when a span ends at EOF', 'clear reproduction', 'bug'];

/** A masked row as the API answers it after the switch: the fields that name its issue left null. */
const maskedAnswer = (): ContributeIssueAnswer => ({
  ...issue({ masked: maskedIssue() }),
  issueId: null,
  repositoryId: null,
  nameWithOwner: null,
  number: null,
  url: null,
  title: null,
  labels: null,
  why: null,
});

describe("the live feed's masked rows", () => {
  it('passes a named row on as it is', () => {
    expect(keyedIssueOf(issue())).toEqual(issue());
  });

  it('keys a masked row by its mask id, set apart, with or without a node id', () => {
    expect(keyedIssueOf(issue({ masked: maskedIssue() })).issueId).toBe('mask:q7k2m9xa');
    expect(keyedIssueOf(maskedAnswer()).issueId).toBe('mask:q7k2m9xa');
  });

  it('strips everything that names the issue from a masked row, whatever the API sent', () => {
    const full = keyedIssueOf(
      issue({
        masked: maskedIssue(),
        repoRules: { ai: 'ALLOWED', summary: 'quill-rs takes AI fixes', source: null } as never,
      }),
    );
    expect(full).toMatchObject({
      repositoryId: '',
      nameWithOwner: '',
      number: 0,
      url: '',
      title: null,
      labels: [],
      why: '',
      repoRules: null,
      masked: maskedIssue(),
    });
    const kept = JSON.stringify({ ...full, masked: null });
    for (const name of NAMING) expect(kept).not.toContain(name);
    expect(keyedIssueOf(maskedAnswer())).toEqual({ ...full, repoRules: null });
  });

  it('keys and strips every row of a page, and passes a missing page on as none', () => {
    const page = keyedPageOf({
      items: [maskedAnswer(), issue({ issueId: 'I_2' })],
      total: 2,
      next: null,
      computedAt: null,
    });
    expect(page?.items.map(({ issueId }) => issueId)).toEqual(['mask:q7k2m9xa', 'I_2']);
    expect(keyedPageOf(null)).toBeNull();
    expect(keyedPageOf(undefined)).toBeNull();
  });

  it('asks the status poll about node ids only', () => {
    expect(nodeIdsOf(['I_1', 'mask:q7k2m9xa', 'I_2'])).toEqual(['I_1', 'I_2']);
  });
});
