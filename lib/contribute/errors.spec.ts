import { describe, expect, it } from 'vitest';

import {
  attemptActionErrorMessage,
  contributeErrorMessage,
  contributeErrorOf,
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

  it('reads anything else as a failure', () => {
    expect(contributeErrorOf(new Error('GraphQL error! 502: Bad Gateway'))).toEqual({ error: 'FAILED' });
    expect(contributeErrorOf(thrown([{ message: 'down', extensions: { code: 'SERVICE_UNAVAILABLE' } }]))).toEqual({
      error: 'FAILED',
    });
  });

  it('has a message for every code', () => {
    for (const code of ['SIGNED_OUT', 'NOT_FOUND', 'NOT_AVAILABLE_YET', 'INVALID', 'FAILED'] as const) {
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
