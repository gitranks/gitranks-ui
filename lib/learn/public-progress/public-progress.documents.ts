import { parse } from 'graphql';

import type { LearnPublicProgress } from './public-progress';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** A person's public progress page: anonymous, the same answer for everyone; null when they have no public record. */
export const LearnPublicProgressDocument = doc<
  { learnPublicProgress: LearnPublicProgress | null },
  { login: string; page: number }
>(`query LearnPublicProgress($login: String!, $page: Int) {
  learnPublicProgress(login: $login, page: $page) {
    record { login lessons newThings topics prsOpened prsMerged reposHelped }
    items {
      kind slug title repo issueNumber passedAt merged prNumber prUrl
      learned { stepId number parts title }
    }
    total
  }
}`);
