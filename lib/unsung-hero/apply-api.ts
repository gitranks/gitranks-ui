import 'server-only';

import { print } from 'graphql';
import { cacheLife } from 'next/cache';

import {
  HeroApplyCancelDocument,
  HeroApplyDocument,
  HeroApplyRegistriesDocument,
  HeroApplyResolveDocument,
  HeroApplySendDocument,
} from './apply.documents';
import type { ApplyAnswer, ApplyResolved, ApplySendInput, HeroApplyView } from './apply.types';
import { accountEmailOf } from '@/lib/account-email';
import { isVerifiedAccountEmail } from '@/lib/follow/verified-email';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { signedFetch } from '@/lib/signed-fetch';
import { currentSessionToken } from '@/lib/workspace/session-token';
import type DocumentNode from '@/types/typed-document-node';

/**
 * Who asks: the signed-in viewer's login and email from the session, with whether GitHub marked that email verified
 * at the sign-in (only then is it where we write when the application is scheduled). Never from the browser.
 */
export type ApplyCaller = { githubLogin?: string; accountEmail?: string; accountEmailVerified: boolean };

/** The longest an apply call waits for the API: a lookup reads every registry the name may be in. */
const TIMEOUT_MS = 15_000;

/** The signed-in viewer, as the session holds them; nobody when signed out or the session broke. */
export async function applyCaller(): Promise<ApplyCaller> {
  const token = await currentSessionToken();
  if (!token?.githubLogin || token.error) return { accountEmailVerified: false };
  const accountEmail = accountEmailOf(token.email);
  return {
    githubLogin: token.githubLogin,
    ...(accountEmail ? { accountEmail } : {}),
    accountEmailVerified: isVerifiedAccountEmail(token.verifiedEmail, accountEmail),
  };
}

type GraphqlBody = { data?: unknown; errors?: unknown };

/** One call as the viewer, never kept; null when the API did not answer or answered an error. */
async function ask<TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables,
  caller: ApplyCaller,
  source: 'ssr' | 'client',
): Promise<TData | null> {
  try {
    const response = await signedFetch(
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
      caller.accountEmailVerified,
    );
    const body = (await response.json().catch(() => null)) as GraphqlBody | null;
    if (!response.ok || !body?.data || (Array.isArray(body.errors) && body.errors.length)) return null;
    return body.data as TData;
  } catch {
    return null;
  }
}

/** Kept an hour: the registries we feature change with a release, not with a visit. */
const REGISTRIES_LIFE = { stale: 300, revalidate: 3_600, expire: 86_400 };

/** The page as a visitor sees it: the registries alone, one read shared by every visitor. A failed read throws. */
async function visitorView(): Promise<HeroApplyView> {
  'use cache';
  cacheLife(REGISTRIES_LIFE);
  const { heroApply } = await graphqlDirect(HeroApplyRegistriesDocument);
  return { registries: heroApply.registries, viewer: null, application: null, packages: [] };
}

/**
 * The page's read: signed out, the registries (kept on the server); signed in, the viewer's own answer, never kept.
 * Null when the API cannot be read.
 */
export async function readHeroApply(caller: ApplyCaller): Promise<HeroApplyView | null> {
  if (!caller.githubLogin) return visitorView().catch(() => null);
  const data = await ask(HeroApplyDocument, {} as Record<string, never>, caller, 'ssr');
  return data?.heroApply ?? null;
}

const UNAVAILABLE_RESOLVED: ApplyResolved = { status: 'UNAVAILABLE', packages: [] };

/** A typed name or registry link, looked up as the viewer. */
export async function resolveHeroApply(caller: ApplyCaller, input: string): Promise<ApplyResolved> {
  if (!caller.githubLogin) return UNAVAILABLE_RESOLVED;
  const data = await ask(HeroApplyResolveDocument, { input }, caller, 'client');
  return data?.heroApplyResolve ?? UNAVAILABLE_RESOLVED;
}

const refused = (refusal: ApplyAnswer['refusal']): ApplyAnswer => ({ ok: false, refusal, application: null });

/** Sends the viewer's application. */
export async function sendHeroApply(caller: ApplyCaller, input: ApplySendInput): Promise<ApplyAnswer> {
  if (!caller.githubLogin) return refused('SIGN_IN');
  const data = await ask(HeroApplySendDocument, { input }, caller, 'client');
  return data?.heroApplySend ?? refused('UNAVAILABLE');
}

/** Removes the viewer's application while it is in review. */
export async function cancelHeroApply(caller: ApplyCaller): Promise<ApplyAnswer> {
  if (!caller.githubLogin) return refused('SIGN_IN');
  const data = await ask(HeroApplyCancelDocument, {} as Record<string, never>, caller, 'client');
  return data?.heroApplyCancel ?? refused('UNAVAILABLE');
}
