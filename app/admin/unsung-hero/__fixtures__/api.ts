import type { Mock } from 'vitest';

/** One call the page made to the API: the operation, its variables, and who it said was asking. */
export type SentCall = {
  operation: string;
  variables: Record<string, unknown>;
  source: unknown;
  githubLogin: unknown;
  accountEmail: unknown;
};

/** The calls a mocked `signedFetch` was given. */
export const sentOf = (signedFetch: Mock): SentCall[] =>
  signedFetch.mock.calls.map(([, init, source, githubLogin, accountEmail]) => {
    const body = JSON.parse(String((init as RequestInit).body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    return {
      operation: /(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1] ?? '',
      variables: body.variables,
      source,
      githubLogin,
      accountEmail,
    };
  });

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** What the API answers a viewer it does not let in. */
export const NOT_FOUND_ANSWER = { errors: [{ message: 'Not Found', extensions: { code: 'NOT_FOUND' } }], data: null };

/** Answers each operation by its name; an operation with no answer is a network failure. */
export function answerBy(signedFetch: Mock, answers: Record<string, () => Response | Promise<Response>>) {
  signedFetch.mockImplementation(async (_path: string, init: RequestInit) => {
    const { query } = JSON.parse(String(init.body)) as { query: string };
    const operation = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? '';
    const answer = answers[operation];
    if (!answer) throw new Error(`unexpected operation ${operation}`);
    return answer();
  });
}
