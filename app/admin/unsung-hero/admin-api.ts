import 'server-only';

import { print } from 'graphql';

import {
  UnsungHeroAdminDocument,
  UnsungHeroCancelDocument,
  UnsungHeroLiveCheckDocument,
  UnsungHeroMarkNotifiedDocument,
  UnsungHeroScheduleDocument,
  UnsungHeroSkipDocument,
} from './admin.documents';
import type { HeroActionResult, HeroBoard, HeroLiveCheckResult, HeroScheduleInput } from './admin.types';
import { auth } from '@/auth';
import { accountEmailOf } from '@/lib/account-email';
import { type RequestSource, signedFetch } from '@/lib/signed-fetch';
import type DocumentNode from '@/types/typed-document-node';

/** Who asks: the signed-in viewer's login and email, read from the session on the server, never from the browser. */
export type AdminCaller = { githubLogin?: string; accountEmail?: string };

/**
 * `not_found`: the API answered "not found" (not an admin, or a session without a login) or does not know the
 * operation; `unavailable`: it did not answer; `failed`: any other error.
 */
export type AdminFailure = 'not_found' | 'unavailable' | 'failed';

export type AdminAnswer<T> = { ok: true; data: T } | { ok: false; failure: AdminFailure };

/** The longest an admin call waits: a live check is one GitHub request and one package lookup. */
const TIMEOUT_MS = 30_000;

const NOT_FOUND = /not found|Cannot query field|Unknown type|Unknown argument/i;

type GraphqlError = { message?: unknown; extensions?: { code?: unknown } };

/** Why the API refused a call, from its errors. */
export function adminFailureOf(errors: GraphqlError[]): AdminFailure {
  const notFound = errors.some(
    (error) =>
      error?.extensions?.code === 'NOT_FOUND' || (typeof error?.message === 'string' && NOT_FOUND.test(error.message)),
  );
  return notFound ? 'not_found' : 'failed';
}

/** The signed-in viewer, as the session holds them; empty when nobody is signed in or the session broke. */
export async function adminCaller(): Promise<AdminCaller> {
  const session = await auth();
  const githubLogin = session?.user?.githubLogin && !session.error ? session.user.githubLogin : undefined;
  if (!githubLogin) return {};
  const accountEmail = accountEmailOf(session?.user?.email);
  return accountEmail ? { githubLogin, accountEmail } : { githubLogin };
}

async function ask<TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables,
  caller: AdminCaller,
  source: RequestSource,
): Promise<AdminAnswer<TData>> {
  // Nobody signed in: the answer is "not found" without asking.
  if (!caller.githubLogin) return { ok: false, failure: 'not_found' };
  let response: Response;
  try {
    response = await signedFetch(
      '/graphql',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: print(document), variables }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      source,
      caller.githubLogin,
      caller.accountEmail,
    );
  } catch {
    return { ok: false, failure: 'unavailable' };
  }
  const body = (await response.json().catch(() => null)) as { data?: unknown; errors?: unknown } | null;
  const errors = Array.isArray(body?.errors) ? (body.errors as GraphqlError[]) : [];
  if (errors.length) return { ok: false, failure: adminFailureOf(errors) };
  if (!response.ok || !body?.data) {
    return { ok: false, failure: response.status >= 500 ? 'unavailable' : 'failed' };
  }
  return { ok: true, data: body.data as TData };
}

/** Unwraps the one field an operation answers; null is "not found", as the API answers a refused viewer. */
async function one<TData, TVariables extends Record<string, unknown>, TField>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables,
  caller: AdminCaller,
  pick: (data: TData) => TField | null,
  source: RequestSource = 'client',
): Promise<AdminAnswer<TField>> {
  const answer = await ask(document, variables, caller, source);
  if (!answer.ok) return answer;
  const field = pick(answer.data);
  return field ? { ok: true, data: field } : { ok: false, failure: 'not_found' };
}

/** The board: the page's render reads it as `ssr`, a press's answer as `client`. */
export const readAdminBoard = (caller: AdminCaller, source: RequestSource = 'ssr'): Promise<AdminAnswer<HeroBoard>> =>
  one(UnsungHeroAdminDocument, {} as Record<string, never>, caller, (data) => data.unsungHeroAdmin, source);

export const skipCandidate = (caller: AdminCaller, repoGithubId: string): Promise<AdminAnswer<HeroActionResult>> =>
  one(UnsungHeroSkipDocument, { repoGithubId }, caller, (data) => data.unsungHeroSkip);

export const liveCheckCandidate = (
  caller: AdminCaller,
  repoGithubId: string,
  packageName: string | null,
): Promise<AdminAnswer<HeroLiveCheckResult>> =>
  one(UnsungHeroLiveCheckDocument, { repoGithubId, packageName }, caller, (data) => data.unsungHeroLiveCheck);

export const scheduleSlot = (caller: AdminCaller, input: HeroScheduleInput): Promise<AdminAnswer<HeroActionResult>> =>
  one(UnsungHeroScheduleDocument, { input }, caller, (data) => data.unsungHeroSchedule);

export const cancelSlot = (caller: AdminCaller, id: string): Promise<AdminAnswer<HeroActionResult>> =>
  one(UnsungHeroCancelDocument, { id }, caller, (data) => data.unsungHeroCancel);

export const markSlotNotified = (caller: AdminCaller, id: string): Promise<AdminAnswer<HeroActionResult>> =>
  one(UnsungHeroMarkNotifiedDocument, { id }, caller, (data) => data.unsungHeroMarkNotified);
