'use server';

import type { ApplyAnswer, ApplyResolved, ApplySendInput } from '@/lib/unsung-hero/apply.types';
import { applyCaller, cancelHeroApply, resolveHeroApply, sendHeroApply } from '@/lib/unsung-hero/apply-api';
import { APPLY_NOTE_MAX, APPLY_TYPED_MAX } from '@/lib/unsung-hero/apply-copy';

/** A registry as the API names it. */
const REGISTRY = /^[A-Z]{1,20}$/;
/** The longest package name of any registry (Maven's `group:artifact`). */
const NAME_MAX = 500;

const textOf = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;

/**
 * Looks up what the viewer typed in "Nominate another package": a name or a registry link. The viewer is read from
 * the session, never from the browser; a visitor, or nothing typed, gets nothing looked up.
 */
export async function resolveApplyPackage(input: string): Promise<ApplyResolved> {
  const typed = textOf(input, APPLY_TYPED_MAX);
  if (!typed) return { status: 'NOT_FOUND', packages: [] };
  return resolveHeroApply(await applyCaller(), typed);
}

/**
 * Sends the viewer's application: a chosen package or a nomination as typed (one of them, the package first), and the
 * note. The API looks every package up again and decides; anything the browser sends beyond these fields is dropped.
 */
export async function sendApplication(input: ApplySendInput): Promise<ApplyAnswer> {
  const registry = typeof input?.registry === 'string' && REGISTRY.test(input.registry) ? input.registry : undefined;
  const name = textOf(input?.name, NAME_MAX);
  const typed = textOf(input?.typed, APPLY_TYPED_MAX);
  const note = textOf(input?.note, APPLY_NOTE_MAX);
  const chosen = registry && name ? { registry, name } : null;
  if (!chosen && !typed) return { ok: false, refusal: 'BAD_INPUT', application: null };
  return sendHeroApply(await applyCaller(), { ...(chosen ?? { typed }), ...(note ? { note } : {}) });
}

/** Removes the viewer's application while it is in review. */
export async function cancelApplication(): Promise<ApplyAnswer> {
  return cancelHeroApply(await applyCaller());
}
