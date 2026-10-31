import { describe, expect, it } from 'vitest';

import {
  attemptActionErrorMessage,
  contributeErrorMessage,
  contributeErrorOf,
  contributeSetErrorMessage,
  contributeSetErrorOf,
  maintainerErrorMessage,
  maintainerErrorOf,
} from './errors';

const thrown = (errors: unknown[]) => new Error(JSON.stringify(errors));

describe('contributeErrorOf', () => {
  it('reads a hidden Contribute as NOT_FOUND', () => {
    expect(contributeErrorOf(thrown([{ message: 'Not found', extensions: { code: 'NOT_FOUND' } }]))).toEqual({
      error: 'NOT_FOUND',
    });
  });

  it('reads an operation the API does not know yet as not available', () => {
    expect(
      contributeErrorOf(
        thrown([
          {
            message: 'Cannot query field "skipIssue" on type "Mutation".',
            extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
          },
        ]),
      ),
    ).toEqual({ error: 'NOT_AVAILABLE_YET' });
    expect(contributeErrorOf(thrown([{ message: 'Cannot query field "grant" on type "Contribute".' }]))).toEqual({
      error: 'NOT_AVAILABLE_YET',
    });
  });

  it("keeps the API's message for a refused value", () => {
    expect(
      contributeErrorOf(
        thrown([{ message: 'attemptCapUsd must be at most 100', extensions: { code: 'BAD_USER_INPUT' } }]),
      ),
    ).toEqual({ error: 'INVALID', message: 'attemptCapUsd must be at most 100' });
  });

  it('reads an issue that is no longer free as taken, whatever else comes with it', () => {
    expect(
      contributeErrorOf(
        thrown([
          { message: 'The issue is no longer available', extensions: { code: 'ISSUE_TAKEN' } },
          { message: 'conflict', extensions: { code: 'CONFLICT' } },
        ]),
      ),
    ).toEqual({ error: 'ISSUE_TAKEN' });
  });

  it('reads anything else as a failure', () => {
    expect(contributeErrorOf(new Error('GraphQL error! 502: Bad Gateway'))).toEqual({ error: 'FAILED' });
    expect(contributeErrorOf(thrown([{ message: 'down', extensions: { code: 'SERVICE_UNAVAILABLE' } }]))).toEqual({
      error: 'FAILED',
    });
  });

  it('has a message for every code', () => {
    for (const code of ['SIGNED_OUT', 'NOT_FOUND', 'NOT_AVAILABLE_YET', 'INVALID', 'ISSUE_TAKEN', 'FAILED'] as const) {
      expect(contributeErrorMessage(code)).toMatch(/\w/);
    }
    expect(contributeErrorMessage('INVALID', 'Too big')).toBe('Too big');
  });
});

describe('attemptActionErrorMessage', () => {
  it("says an attempt that is not found is gone or no longer the user's, not that Contribute is closed to them", () => {
    expect(attemptActionErrorMessage('NOT_FOUND')).toContain('This attempt is gone, or it is no longer yours');
    expect(attemptActionErrorMessage('NOT_FOUND')).not.toContain('not open to your account');
  });

  it('says everything else as the other Contribute calls do', () => {
    expect(attemptActionErrorMessage('INVALID', 'The attempt is not in review')).toBe('The attempt is not in review');
    expect(attemptActionErrorMessage('FAILED')).toBe(contributeErrorMessage('FAILED'));
  });
});

describe('maintainerErrorOf', () => {
  it.each([
    ['UNAUTHENTICATED', 'SIGNED_OUT'],
    ['SERVICE_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['GRAPHQL_VALIDATION_FAILED', 'NOT_AVAILABLE_YET'],
    ['BAD_USER_INPUT', 'FAILED'],
    ['NOT_FOUND', 'FAILED'],
  ])('reads %s as %s', (code, error) => {
    expect(maintainerErrorOf(thrown([{ message: 'gho_secret', extensions: { code } }]))).toBe(error);
  });

  it('reads an issue that is no longer free as taken, whatever else comes with it', () => {
    expect(
      contributeErrorOf(
        thrown([
          { message: 'The issue is no longer available', extensions: { code: 'ISSUE_TAKEN' } },
          { message: 'conflict', extensions: { code: 'CONFLICT' } },
        ]),
      ),
    ).toEqual({ error: 'ISSUE_TAKEN' });
  });

  it('reads anything else as a failure', () => {
    expect(maintainerErrorOf(new Error('GraphQL error! 502: Bad Gateway'))).toBe('FAILED');
    expect(maintainerErrorOf(undefined)).toBe('FAILED');
  });

  it("tells each in its own words, never the API's", () => {
    for (const error of ['SIGNED_OUT', 'GITHUB_UNAVAILABLE', 'NOT_AVAILABLE_YET', 'FAILED'] as const) {
      expect(maintainerErrorMessage(error)).not.toContain('gho_');
    }
    expect(maintainerErrorMessage('SIGNED_OUT')).toContain('Sign in again');
    expect(maintainerErrorMessage('GITHUB_UNAVAILABLE')).toBe('GitHub did not answer. Try again in a minute.');
  });
});

describe('contributeSetErrorOf', () => {
  it.each([
    ['RATE_LIMITED', 'RATE_LIMITED'],
    ['GITHUB_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['LIST_FULL', 'LIST_FULL'],
    ['CONFLICT', 'CONFLICT'],
    ['SERVICE_UNAVAILABLE', 'UNAVAILABLE'],
    ['NOT_FOUND', 'NOT_FOUND'],
    ['UNAUTHENTICATED', 'SIGNED_OUT'],
  ])('reads %s as %s', (code, error) => {
    expect(contributeSetErrorOf(thrown([{ message: 'x', extensions: { code } }]))).toEqual({ error });
  });

  it('keeps the rest as the other Contribute calls read them', () => {
    expect(contributeSetErrorOf(thrown([{ message: 'Too long', extensions: { code: 'BAD_USER_INPUT' } }]))).toEqual({
      error: 'INVALID',
      message: 'Too long',
    });
    expect(contributeSetErrorOf(new Error('GraphQL error! 502'))).toEqual({ error: 'FAILED' });
  });
});

describe('contributeSetErrorMessage', () => {
  const limits = { addsPerDay: 60, resolvesPerDay: 10, feedbackPerDay: 10, ignore: 50 };

  it('says which day limit is reached', () => {
    expect(contributeSetErrorMessage('RATE_LIMITED', 'add', limits)).toContain('You can add 60 times a day');
    expect(contributeSetErrorMessage('RATE_LIMITED', 'resolve', limits)).toBe(
      'You can refresh your libraries 10 times a day. Try again tomorrow.',
    );
    expect(contributeSetErrorMessage('RATE_LIMITED', 'feedback', limits)).toBe(
      'You can send 10 messages a day. Try again tomorrow.',
    );
  });

  it('says what a missing name, a full ignore list, GitHub or an outage means', () => {
    expect(contributeSetErrorMessage('NOT_FOUND', 'add')).toBe('GitHub has no user, org or repo by that name.');
    expect(contributeSetErrorMessage('NOT_FOUND', 'ignore')).toContain('no longer on your lists');
    expect(contributeSetErrorMessage('NOT_FOUND', 'change')).toBe(contributeErrorMessage('NOT_FOUND'));
    expect(contributeSetErrorMessage('INVALID', 'add', limits, 'bad')).toBe(
      'Enter a repo (owner/name), a GitHub link, a user or an org.',
    );
    expect(contributeSetErrorMessage('INVALID', 'change', limits, 'Not a mode')).toBe('Not a mode');
    expect(contributeSetErrorMessage('LIST_FULL', 'ignore', limits)).toBe(
      'Your ignore list is full (50): unignore a repo first.',
    );
    expect(contributeSetErrorMessage('GITHUB_UNAVAILABLE', 'add')).toBe("GitHub didn't answer. Try again in a minute.");
    expect(contributeSetErrorMessage('CONFLICT', 'change')).toContain('changed meanwhile');
    expect(contributeSetErrorMessage('UNAVAILABLE', 'change')).toContain('down for a moment');
  });
});
