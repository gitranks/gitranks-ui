import { parse } from 'graphql';

import type { ContributeFairUseNotice, ContributeFairUseNotices } from './contribute.types';
import type { FairUseAppeal } from './masked-issue.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const NOTICE =
  'id kind rule phase text vars { prs { name url } n k } choices { id label } createdAt dismissedAt answer { choice text at }';

/** What the top of Contribute shows about fair use: the Terms banner, the open messages, the block, the list cut. */
export const ContributeFairUseNoticesDocument = doc<{ contributeFairUseNotices: ContributeFairUseNotices | null }>(
  `query ContributeFairUseNotices { contributeFairUseNotices {
    rulesBanner { text linkText path } notices { ${NOTICE} } block { ${NOTICE} } listCut { text noticeId }
  } }`,
);

/** One of the user's messages, closed or answered too, for its answer page. */
export const ContributeFairUseNoticeDocument = doc<
  { contributeFairUseNotice: ContributeFairUseNotice | null },
  { id: string }
>(`query ContributeFairUseNotice($id: ID!) { contributeFairUseNotice(id: $id) { ${NOTICE} } }`);

/** Closes one message, or the Terms banner (`rules`, which records that the user read the new rule). */
export const DismissContributeNoticeDocument = doc<
  { dismissContributeNotice: boolean },
  { noticeId?: string; rules?: boolean }
>(
  'mutation DismissContributeNotice($noticeId: ID, $rules: Boolean) { dismissContributeNotice(noticeId: $noticeId, rules: $rules) }',
);

/** The user's answer to a message: a choice it offers, text, or both; a second answer replaces the first. */
export const AnswerContributeNoticeDocument = doc<
  { answerContributeNotice: ContributeFairUseNotice },
  { noticeId: string; choice: string | null; text: string }
>(
  `mutation AnswerContributeNotice($noticeId: ID!, $choice: String, $text: String!) {
    answerContributeNotice(noticeId: $noticeId, choice: $choice, text: $text) { ${NOTICE} }
  }`,
);

/**
 * A request to look again at a closed access, with one text: when it was sent and when we answered it. One open at a
 * time: while one is open, the API answers it as it is. An operation of its own, so an API that does not know it yet
 * fails it alone.
 */
export const AppealFairUseDocument = doc<{ appealFairUse: FairUseAppeal }, { text: string }>(
  'mutation AppealFairUse($text: String!) { appealFairUse(text: $text) { at answeredAt } }',
);
