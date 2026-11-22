'use server';

import type { HeroActionResult, HeroApplicationRow, HeroBoard, HeroSlot } from './admin.types';
import {
  type AdminAnswer,
  type AdminCaller,
  type AdminFailure,
  adminCaller,
  cancelSlot,
  liveCheckCandidate,
  markApplicationNotPicked,
  markSlotNotified,
  readAdminBoard,
  scheduleSlot,
  skipCandidate,
} from './admin-api';
import { APPLICATION_NOT_FOUND_TEXT, applicationNameOf, refusalText, weekShort } from './admin-copy';
import { type AdminIntent, type AdminNotice, type AdminPress, type AdminState, adminPressOf } from './admin-state';

const FAILURE_TEXT: Record<AdminFailure, string> = {
  not_found: 'Not done: the API answered “not found”. Your session may have ended: sign in again and reload this page.',
  unavailable: 'The API did not answer in time. It may or may not have gone through: reload the page to see.',
  failed: 'Not done: the API could not take this request.',
};

const failed = (intent: AdminIntent, failure: AdminFailure): AdminNotice => ({
  intent,
  tone: 'failed',
  text: FAILURE_TEXT[failure],
});

/** The repository a press names, as the page last listed it. */
function nameOf(board: HeroBoard | undefined, repoGithubId: string): string {
  const row = board?.shortlist?.find((candidate) => candidate.repo.githubId === repoGithubId);
  const application = board?.applications?.inReview.find((each) => each.repo?.githubId === repoGithubId);
  return row?.repo.nameWithOwner ?? application?.repo?.nameWithOwner ?? 'the repository';
}

/** An application the page last listed, by its id. */
const applicationOf = (board: HeroBoard | undefined, id: string): HeroApplicationRow | undefined =>
  board?.applications?.inReview.find((each) => each.id === id);

/** A refusal's words; an application that is gone or no longer in review says so in its own words. */
const refusalOf = (refusal: string, applicationId: string | null) =>
  applicationId && refusal === 'NOT_FOUND' ? APPLICATION_NOT_FOUND_TEXT : refusalText(refusal);

function doneText(press: AdminPress, slot: HeroSlot | null, board: HeroBoard | undefined): string {
  const name = slot?.repo.nameWithOwner ?? ('repoGithubId' in press ? nameOf(board, press.repoGithubId) : 'the slot');
  const dates = slot ? weekShort(slot) : null;
  const week = dates ? ` (${dates})` : '';
  switch (press.intent) {
    case 'skip':
      return `Skipped ${name}: it is not listed again.`;
    case 'schedule':
      if (!press.headsUp) {
        return `Scheduled ${name} for ${dates ?? press.week} with no heads-up: the maintainer gets no email before the week.`;
      }
      return `Scheduled ${name} for ${dates ?? press.week}. The heads-up goes to the maintainer 4 days before.`;
    case 'cancel':
      return `Cancelled ${name}${week}.`;
    case 'mark-notified':
      return `Marked the heads-up of ${name}${week} as sent.`;
    default:
      return 'Done.';
  }
}

/** A write's answer as the notice says it. */
function noticeOf(press: AdminPress, answer: AdminAnswer<HeroActionResult>, board: HeroBoard | undefined): AdminNotice {
  if (!answer.ok) return failed(press.intent, answer.failure);
  const { refusal, slot } = answer.data;
  const applicationId = press.intent === 'schedule' ? press.applicationId : null;
  if (refusal) return { intent: press.intent, tone: 'refused', text: refusalOf(refusal, applicationId) };
  return { intent: press.intent, tone: 'done', text: doneText(press, slot, board) };
}

async function write(press: AdminPress, caller: AdminCaller): Promise<AdminAnswer<HeroActionResult>> {
  switch (press.intent) {
    case 'skip':
      return skipCandidate(caller, press.repoGithubId);
    case 'schedule':
      return scheduleSlot(caller, {
        repoGithubId: press.repoGithubId,
        week: press.week,
        registry: press.registry,
        name: press.name,
        line: press.line,
        reason: press.reason,
        text: press.text,
        headsUp: press.headsUp,
        ...(press.applicationId ? { applicationId: press.applicationId } : {}),
      });
    case 'cancel':
      return cancelSlot(caller, press.id);
    case 'mark-notified':
      return markSlotNotified(caller, press.id);
    default:
      throw new Error('not a write');
  }
}

/** The board again after a press; the one the page had when it cannot be read, and the notice says so. */
async function withBoard(previous: AdminState, caller: AdminCaller, notice: AdminNotice, check = previous.check) {
  const board = await readAdminBoard(caller, 'client');
  if (board.ok) return { board: board.data, notice, check };
  return {
    board: previous.board,
    notice: { ...notice, text: `${notice.text} The board could not be read again: reload the page.` },
    check,
  };
}

/**
 * Every button of the board: one press, a POST. The viewer is read from the session here, never from the form, and
 * the API decides who may act (to anyone else it answers "not found"). Answers the board as it now is and what the
 * press did. A form that names no known press changes nothing.
 */
export async function pressAdmin(previous: AdminState, form: FormData): Promise<AdminState> {
  const press = adminPressOf(form);
  if (!press) return previous;
  const caller = await adminCaller();

  if (press.intent === 'live-check') {
    const { repoGithubId, applicationId } = press;
    const answer = await liveCheckCandidate(caller, repoGithubId, press.packageName, applicationId);
    if (!answer.ok) return { ...previous, notice: failed(press.intent, answer.failure) };
    const { check, refusal } = answer.data;
    const notice: AdminNotice = refusal
      ? { intent: press.intent, tone: 'refused', text: refusalOf(refusal, applicationId) }
      : { intent: press.intent, tone: 'done', text: 'Live check done.' };
    return withBoard(previous, caller, notice, {
      repoGithubId,
      ...(applicationId ? { applicationId } : {}),
      check,
      refusal,
    });
  }

  if (press.intent === 'not-picked') {
    const listed = applicationOf(previous?.board, press.id);
    const answer = await markApplicationNotPicked(caller, press.id);
    if (!answer.ok) return { ...previous, notice: failed(press.intent, answer.failure) };
    const { refusal, application } = answer.data;
    const row = application ?? listed;
    const notice: AdminNotice = refusal
      ? { intent: press.intent, tone: 'refused', text: refusalOf(refusal, press.id) }
      : {
          intent: press.intent,
          tone: 'done',
          text: `Not picked: ${row ? applicationNameOf(row) : 'the application'}. They see it on their page and can apply again.`,
        };
    return withBoard(previous, caller, notice);
  }

  const answer = await write(press, caller);
  const notice = noticeOf(press, answer, previous?.board);
  // Nothing went through: the board is as it was.
  if (!answer.ok) return { ...previous, notice };
  return withBoard(previous, caller, notice);
}
