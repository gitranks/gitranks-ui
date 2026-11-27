import { HomeFacts, HomeIntro, HomeQuestionsSection, HomeSteps } from './home-landing';
import { MineFoot, OtherPlans, PlanBox } from './home-mine';
import { HomeSearch } from './home-search';
import { INTERVIEWS_COLUMN } from '@/components/interviews/column';
import type { InterviewsHomeView as View } from '@/lib/interviews/home';
import type { InterviewsHome } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

export type InterviewsHomeViewProps = {
  /** The companies, in the read's order, each with its plans. */
  home: InterviewsHome;
  view: View;
  /**
   * The person's side is being read: in a browser that holds a session the page stays hidden in its place until it
   * comes, so a person with plans never sees the landing first, and shows by itself 4s after the first paint.
   */
  reading?: boolean;
};

/** Interviews home: the landing, or the person's own home once they have a plan in progress. */
export function InterviewsHomeView({ home, view, reading = false }: Readonly<InterviewsHomeViewProps>) {
  return (
    <main
      className={cn(
        INTERVIEWS_COLUMN,
        reading && '[html[data-has-session]_&]:invisible [html[data-has-session]_&]:animate-build-reveal',
      )}
      data-interviews-home={view.kind}
      aria-busy={reading || undefined}
    >
      {view.kind === 'landing' ? (
        <>
          <HomeSearch home={home} place="landing" intro={<HomeIntro />} />
          <HomeSteps />
          <HomeFacts />
          <HomeQuestionsSection />
        </>
      ) : (
        <>
          <PlanBox row={view.first} />
          <OtherPlans rows={view.others} />
          <HomeSearch home={home} place="mine" mine={view.companies} />
          <MineFoot />
        </>
      )}
    </main>
  );
}
