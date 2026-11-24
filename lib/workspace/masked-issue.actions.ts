'use server';

import { run } from './action-run';
import type { ContributeActionResult } from './errors';
import { markIssueLook, takeIssueLookMark } from './issue-look-mark';
import type { IssueStart } from './issue-start';
import {
  GIVE_BACK_REASONS,
  type IssuePageFrom,
  issuePageHrefOf,
  issueSurfaceOf,
  maskIdOf,
  OUT_NOTE_MAX,
} from './masked-issue';
import {
  ExtendIssueLookDocument,
  GiveBackIssueDocument,
  IssuePageDocument,
  LookAtIssueDocument,
  SaveIssueOutNoteDocument,
  SetIssueOutReasonDocument,
  StartMaskedIssueDocument,
} from './masked-issue.documents';
import type { IssueLooked, IssueOutReason, IssuePage } from './masked-issue.types';
import { signIn } from '@/auth';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';

/** What the page of one issue does, as the session's user, never one named in the arguments. */

const invalid = <T>(): ContributeActionResult<T> => ({ ok: false, error: 'INVALID' });

const fromOf = (value: unknown): IssuePageFrom => (value === 'learn' ? 'learn' : 'contribute');

/** The page again: after a press elsewhere, and while it waits for the agent to start. */
export async function readIssuePage(id: string): Promise<ContributeActionResult<IssuePage | null>> {
  const maskId = maskIdOf(id);
  if (!maskId) return invalid();
  return run(IssuePageDocument, { id: maskId }, (data) => data.issuePage);
}

/** "See the full issue": holds it for 15 minutes and shows it in full, or says why not. Counts toward the day. */
export async function lookAtIssue(id: string, from: IssuePageFrom): Promise<ContributeActionResult<IssueLooked>> {
  const maskId = maskIdOf(id);
  if (!maskId) return invalid();
  return run(
    LookAtIssueDocument,
    { id: maskId, surface: issueSurfaceOf(fromOf(from)), channel: 'WEB' },
    (data) => data.lookAtIssue,
  );
}

/**
 * The press a visitor made before signing in, made on their return: only when this browser started that sign-in for
 * this issue, so a link carrying `?look=1` counts nothing by itself, and only while the details are still hidden
 * (`masked`). The mark is used up on every return. Null: no press to make.
 */
export async function lookOnReturn(
  id: string,
  from: IssuePageFrom,
  masked = true,
): Promise<ContributeActionResult<IssueLooked> | null> {
  const maskId = maskIdOf(id);
  if (!maskId) return null;
  if (!(await takeIssueLookMark(maskId)) || masked !== true) return null;
  return run(
    LookAtIssueDocument,
    { id: maskId, surface: issueSurfaceOf(fromOf(from)), channel: 'SIGN_IN' },
    (data) => data.lookAtIssue,
  );
}

/** A visitor's "See the full issue": the GitHub sign-in, back to the issue's page, where the press is made. */
export async function signInToSeeIssue(form: FormData): Promise<void> {
  const maskId = maskIdOf(form.get('id'));
  const from = fromOf(form.get('from'));
  if (maskId) await markIssueLook(maskId);
  await signIn(IDENTITY_PROVIDER, { redirectTo: maskId ? issuePageHrefOf(maskId, from, true) : '/' });
}

/** "Give it back": the issue leaves the person's list and goes to the others at once. */
export async function giveBackIssue(id: string): Promise<ContributeActionResult<IssuePage>> {
  const maskId = maskIdOf(id);
  if (!maskId) return invalid();
  return run(GiveBackIssueDocument, { id: maskId }, (data) => data.giveBackIssue);
}

const GIVEN_REASONS: readonly IssueOutReason[] = GIVE_BACK_REASONS.map(({ reason }) => reason);

/** One reason of a give-back, on or off, saved at once. */
export async function setIssueOutReason(
  id: string,
  reason: IssueOutReason,
  on: boolean,
): Promise<ContributeActionResult<IssuePage>> {
  const maskId = maskIdOf(id);
  if (!maskId || !GIVEN_REASONS.includes(reason) || typeof on !== 'boolean') return invalid();
  return run(SetIssueOutReasonDocument, { id: maskId, reason, on }, (data) => data.setIssueOutReason);
}

/** The note of a give-back, up to 1,000 characters. */
export async function saveIssueOutNote(id: string, note: string): Promise<ContributeActionResult<IssuePage>> {
  const maskId = maskIdOf(id);
  if (!maskId || typeof note !== 'string' || note.length > OUT_NOTE_MAX) return invalid();
  return run(SaveIssueOutNoteDocument, { id: maskId, note }, (data) => data.saveIssueOutNote);
}

/** Holds the issue 30 minutes from now, once: the prompt copied, or "I added it" pressed. */
export async function extendIssueLook(id: string): Promise<ContributeActionResult<IssuePage>> {
  const maskId = maskIdOf(id);
  if (!maskId) return invalid();
  return run(ExtendIssueLookDocument, { id: maskId }, (data) => data.extendIssueLook);
}

/** "Start with the hosted agent", on the issue the person holds. The API waits up to 30 seconds for the start. */
export async function startHeldIssue(id: string): Promise<ContributeActionResult<IssueStart>> {
  const maskId = maskIdOf(id);
  if (!maskId) return invalid();
  return run(StartMaskedIssueDocument, { maskId }, (data) => data.startContributeIssue);
}
