import { describe, expect, it } from 'vitest';

import { pullRequestMetadataOf, pullRequestTitleOf } from './pull-request-title';

describe("a pull request page's tab title", () => {
  it('names the repository and the issue from the address', async () => {
    expect(pullRequestTitleOf({ owner: 'harbor-kit', repo: 'relay', issue: '431' })).toBe('harbor-kit/relay #431');
    expect(await pullRequestMetadataOf(Promise.resolve({ owner: 'acme', repo: 'notebook.js', issue: '1290' }))).toEqual(
      { title: 'acme/notebook.js #1290' },
    );
  });

  it('keeps the plain title for an address of another shape', () => {
    expect(pullRequestTitleOf({ owner: 'harbor kit', repo: 'relay', issue: '431' })).toBe('A pull request');
    expect(pullRequestTitleOf({ owner: 'harbor-kit', repo: 'relay', issue: 'abc' })).toBe('A pull request');
    expect(pullRequestTitleOf({ owner: 'harbor-kit', repo: '<b>', issue: '1' })).toBe('A pull request');
  });
});
