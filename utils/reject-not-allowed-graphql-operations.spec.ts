import { afterEach, describe, expect, it, vi } from 'vitest';

import { rejectNotAllowedGraphqlOperations } from './reject-not-allowed-graphql-operations';

describe('rejectNotAllowedGraphqlOperations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    'query { user(login: "octocat") { login } }',
    'query Q($login: String!) { organization(login: $login) { login } insights { id } }',
    'query { me: user(login: "octocat") { ...UserFields } } fragment UserFields on User { login }',
    'query { user(login: "octocat") { ... on User { login } } }',
  ])('lets %s through', (query) => {
    expect(rejectNotAllowedGraphqlOperations(query)).toBe(false);
  });

  it.each([
    ['another root field', 'query { packagesGate { everyone } }'],
    ['another root field beside an allowed one', 'query { user(login: "x") { login } contribute { previewAllowed } }'],
    ['a fragment spread on the root', 'query { ...Root } fragment Root on Query { contribute { previewAllowed } }'],
    [
      'a fragment spread on the root naming only allowed fields',
      'query { ...Root } fragment Root on Query { user(login: "x") { login } }',
    ],
    ['an inline fragment on the root', 'query { ... on Query { contribute { previewAllowed } } }'],
    ['an inline fragment on the root without a type', 'query { ... { contribute { previewAllowed } } }'],
    [
      'an inline fragment on the root naming only allowed fields',
      'query { ... on Query { user(login: "x") { login } } }',
    ],
    ['an introspection field', 'query { __schema { types { name } } }'],
    ['an introspection field deep inside', 'query { user(login: "x") { __typename } }'],
    ['a mutation of another field', 'mutation { contributeFirstFetch }'],
    ['an empty query', ''],
  ])('refuses %s', (_name, query) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(rejectNotAllowedGraphqlOperations(query)).toBe(true);
  });

  it('refuses a query that does not parse', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(rejectNotAllowedGraphqlOperations('query {')).toBe(true);
  });
});
