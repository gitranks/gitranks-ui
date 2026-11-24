import { parse } from 'graphql';

import type {
  LearnProgress,
  LearnProgressLessons,
  LearnProgressLessonsView,
  LearnProgressMerged,
  LearnProgressRepos,
} from './progress.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** The viewer's Learn numbers. */
export const LearnProgressDocument = doc<{ learnProgress: LearnProgress }>(
  `query LearnProgress {
    learnProgress {
      counts { lessonsPassed newThings reposHelped prsMerged prsOpened }
    }
  }`,
);

const LESSON = `kind slug title repo issueNumber passedAt
  learned { stepId number parts title }
  attemptState prLabel prNumber prUrl visibility`;

/** A page of the lessons the viewer passed (or of those that taught a new thing), with Not finished on page 1. */
export const LearnProgressLessonsDocument = doc<
  { learnProgressLessons: LearnProgressLessons },
  { view: LearnProgressLessonsView; page: number }
>(`query LearnProgressLessons($view: LearnProgressLessonsView, $page: Int) {
  learnProgressLessons(view: $view, page: $page) {
    items { ${LESSON} }
    total
    notFinished { kind slug title repo issueNumber at stepsPassed steps hasLesson }
  }
}`);

/** A page of the viewer's merged Learn pull requests, newest merge first. */
export const LearnProgressMergedDocument = doc<{ learnProgressMerged: LearnProgressMerged }, { page: number }>(
  `query LearnProgressMerged($page: Int) {
  learnProgressMerged(page: $page) { items { repo issueNumber title prNumber prUrl mergedAt hasLesson } total }
}`,
);

/** A page of the repositories the viewer's merged Learn pull requests are in, newest merge first. */
export const LearnProgressReposDocument = doc<{ learnProgressRepos: LearnProgressRepos }, { page: number }>(
  `query LearnProgressRepos($page: Int) {
  learnProgressRepos(page: $page) { items { repo merged lastMergedAt prs { prNumber prUrl } } total }
}`,
);
