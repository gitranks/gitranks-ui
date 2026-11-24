'use server';

import { run } from './action-run';
import type { ContributeFairUseNotice } from './contribute.types';
import type { ContributeActionResult } from './errors';
import { FAIR_USE_ANSWER_MAX, fairUseNoticeIdOf } from './fair-use';
import {
  AnswerContributeNoticeDocument,
  AppealFairUseDocument,
  DismissContributeNoticeDocument,
} from './fair-use.documents';
import { APPEAL_MAX } from './masked-issue';
import type { FairUseAppeal } from './masked-issue.types';

const notFound = (): ContributeActionResult<never> => ({ ok: false, error: 'NOT_FOUND' });

/** Closes one of the user's messages; it stays on its answer page. */
export async function dismissFairUseNotice(noticeId: string): Promise<ContributeActionResult<boolean>> {
  const id = fairUseNoticeIdOf(noticeId);
  if (!id) return notFound();
  return run(DismissContributeNoticeDocument, { noticeId: id }, (data) => data.dismissContributeNotice);
}

/** Closes the Terms banner, which records that the user read the new rule. */
export async function dismissRulesBanner(): Promise<ContributeActionResult<boolean>> {
  return run(DismissContributeNoticeDocument, { rules: true }, (data) => data.dismissContributeNotice);
}

export type FairUseAnswerInput = { noticeId: string; choice: string | null; text: string };

/** The user's answer to a message, a choice it offers, text, or both: the message with its answer. */
export async function answerFairUseNotice(
  input: FairUseAnswerInput,
): Promise<ContributeActionResult<ContributeFairUseNotice>> {
  const id = fairUseNoticeIdOf(input?.noticeId);
  if (!id) return notFound();
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  const choice = typeof input.choice === 'string' && input.choice.trim() ? input.choice.trim() : null;
  if (text.length > FAIR_USE_ANSWER_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Keep it to ${FAIR_USE_ANSWER_MAX.toLocaleString('en-US')} characters at most.`,
    };
  }
  if (!choice && !text) return { ok: false, error: 'INVALID', message: 'Pick an answer or write one.' };
  return run(AnswerContributeNoticeDocument, { noticeId: id, choice, text }, (data) => data.answerContributeNotice);
}

/**
 * Asks us to look again at a closed access, with the user's words: the request as saved, or the one already open.
 * `NOT_AVAILABLE_YET` from an API that does not take requests yet; the page then points to email.
 */
export async function appealFairUse(text: string): Promise<ContributeActionResult<FairUseAppeal>> {
  const words = typeof text === 'string' ? text.trim() : '';
  if (!words) return { ok: false, error: 'INVALID', message: 'Write what we should look at again.' };
  if (words.length > APPEAL_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Keep it to ${APPEAL_MAX.toLocaleString('en-US')} characters at most.`,
    };
  }
  return run(AppealFairUseDocument, { text: words }, (data) => data.appealFairUse);
}
