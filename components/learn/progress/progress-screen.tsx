import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LearnedLessons, MergedPullRequests, NotFinished, PassedLessons, ReposHelped } from './progress-lists';
import { ShareProgress } from './share-progress';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/workspace/pagination';
import { HEADING, PageTitle } from '@/components/workspace/primitives';
import { ViewTabs } from '@/components/workspace/view-tabs';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import {
  LEARN_PROGRESS_PAGE,
  PROGRESS_TABS,
  PROGRESS_VIEWS,
  type ProgressList,
  type ProgressView,
  progressPath,
  progressTotalOf,
} from '@/lib/learn/progress/progress';
import type { LearnProgressCounts } from '@/lib/learn/progress/progress.types';
import { PICK_ISSUE_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** What Your progress shows: the numbers, the view the address names and a page of its list. */
export type ProgressScreenProps = {
  view: ProgressView;
  page: number;
  /** The viewer's numbers; undefined when the read failed. */
  counts: LearnProgressCounts | undefined;
  /**
   * A page of the view's list; undefined when the read failed. Before a first lesson is passed only the first view's
   * is read, for Not finished.
   */
  list?: ProgressList;
  /** The viewer's Learn pull requests open now, for the merged views' empty state; null when not known. */
  openPrs?: number | null;
  /** The Share control's facts: the viewer's public link and what their public page counts. */
  share?: { url: string; publicCounts: LearnProgressCounts | null };
};

/** One sentence above each view's list. */
const VIEW_TEXT: Record<ProgressView, string> = {
  lessons: 'Lessons your agent wrote for your own pull requests, and practice lessons you took.',
  learned: 'Each one is a lesson step you did not know before the lesson, and passed in it. Newest lesson first.',
  repos: 'The repositories that merged a pull request of one of your lessons, newest merge first.',
  merged: 'The pull requests of your lessons that maintainers merged, newest first.',
};

/** What each view's list holds, for "1–20 of 143 lessons". */
const NOUNS: Record<ProgressView, string> = {
  lessons: 'lesson',
  learned: 'lesson',
  repos: 'repo',
  merged: 'pull request',
};

function Head({ share }: { share?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <Link href={LEARN_PATH} prefetch={false} className="self-start text-sm font-semibold text-link hover:underline">
        ← Learn
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle title="Your progress" text="What you have learned so far, and where your fixes landed." />
        {share}
      </div>
    </div>
  );
}

/** A view with nothing to list: what that means, and its one next step when the page's last link is not it. */
function Notice({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      data-section={id}
      className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-5 py-4 text-sm text-muted-foreground"
    >
      {children}
    </div>
  );
}

/** The page's last line, on every view: the next issue, on Learn's Issues. */
function NextLesson() {
  return (
    <div className="border-t pt-4">
      <Link
        href={PICK_ISSUE_PATHS.learn}
        prefetch={false}
        data-next-lesson=""
        className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline max-sm:min-h-11"
      >
        Pick your next issue
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}

/** Nothing passed yet, a contributor who never used Learn too: one card and the way to Learn's Issues. */
function NoLessons() {
  return (
    <section
      aria-labelledby="no-lessons"
      data-section="no-lessons"
      className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5"
    >
      <h2 id="no-lessons" className={HEADING.card}>
        No lessons yet
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Your agent fixes an issue you pick, and the fix walkthrough teaches what it used.
      </p>
      <Button asChild className="min-h-11 px-5 font-semibold max-sm:w-full">
        <Link href={PICK_ISSUE_PATHS.learn} prefetch={false}>
          See the issues
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

/** The view's list, or what an empty one means. */
function ViewBody({ list, openPrs }: { list: ProgressList; openPrs: number | null | undefined }) {
  switch (list.view) {
    case 'lessons':
      return <PassedLessons lessons={list.lessons.items} />;
    case 'learned':
      return list.lessons.items.length ? (
        <LearnedLessons lessons={list.lessons.items} />
      ) : (
        <Notice id="nothing-new">
          You already knew what these lessons asked you first. A new thing shows here when a lesson teaches you one.
        </Notice>
      );
    default: {
      const rows = list.view === 'merged' ? list.merged.items : list.repos.items;
      if (rows.length) {
        return list.view === 'merged' ? (
          <MergedPullRequests prs={list.merged.items} />
        ) : (
          <ReposHelped repos={list.repos.items} />
        );
      }
      return (
        <Notice id="none-merged">
          <p>
            No pull request of yours has been merged yet.
            {openPrs ? ` ${openPrs === 1 ? '1 is' : `${openPrs} are`} open.` : null}
          </p>
          <Button asChild variant="outline" className="min-h-10 px-4 font-semibold text-foreground">
            <Link href={WORKSPACE_PATHS.pullRequests} prefetch={false}>
              Pull requests
            </Link>
          </Button>
        </Notice>
      );
    }
  }
}

/**
 * Your progress: what the viewer has learned so far and where their fixes landed, in four views with their counts
 * (Lessons passed, New things learned, Repos helped, Pull requests merged), the view and its page in the address.
 * It shows no Contribute numbers and nothing that needs the viewer: that is the Pull requests tab's.
 */
export function ProgressScreen({ view, page, counts, list, openPrs, share }: ProgressScreenProps) {
  if (!counts) {
    return (
      <div data-progress="unavailable" className="flex flex-col gap-5">
        <Head />
        <Notice id="progress-unavailable">Your progress is not available right now. Try again in a minute.</Notice>
      </div>
    );
  }
  const empty = counts.lessonsPassed === 0;
  const tabs = PROGRESS_VIEWS.map((key) => ({
    key,
    label: PROGRESS_TABS[key].label,
    href: progressPath({ view: key }),
    count: counts[PROGRESS_TABS[key].count],
  }));
  return (
    <div data-progress={empty ? 'empty' : view} className="flex flex-col gap-5">
      <Head
        share={
          share && !empty ? (
            <ShareProgress url={share.url} counts={counts} publicCounts={share.publicCounts} />
          ) : undefined
        }
      />
      <ViewTabs tabs={tabs} label="Your progress" current={view} />
      {empty ? (
        <>
          <NoLessons />
          {list?.view === 'lessons' ? <NotFinished rows={list.lessons.notFinished} /> : null}
        </>
      ) : (
        <>
          <p className="max-w-prose text-sm text-muted-foreground">{VIEW_TEXT[view]}</p>
          {list ? (
            <>
              <ViewBody list={list} openPrs={openPrs} />
              <Pagination
                page={page}
                pageSize={LEARN_PROGRESS_PAGE}
                total={progressTotalOf(list)}
                noun={NOUNS[view]}
                hrefOf={(to) => progressPath({ view, page: to })}
                always
              />
              {list.view === 'lessons' ? <NotFinished rows={list.lessons.notFinished} /> : null}
            </>
          ) : (
            <Notice id="progress-unavailable">Your progress is not available right now. Try again in a minute.</Notice>
          )}
          <NextLesson />
        </>
      )}
    </div>
  );
}
