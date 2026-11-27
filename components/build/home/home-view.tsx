import { HomeBuilder } from './home-builder';
import { HomeLanding } from './home-landing';
import { BUILD_COLUMN } from '@/components/build/column';
import type { BuildHomeView } from '@/lib/build/home';
import type { BuildProjectCard } from '@/lib/build/types';
import { cn } from '@/lib/utils';

export type HomeViewProps = {
  view: BuildHomeView;
  /** Every live project, in our order: the landing lists them. */
  projects: readonly BuildProjectCard[];
  /** The browser's clock, once the person's side is read; none on the server. */
  now?: Date | null;
  /**
   * The person's side is being read: in a browser that holds a session the page stays hidden in its place until it
   * comes, so a builder never sees the landing first. A visitor's browser shows the landing at once.
   */
  reading?: boolean;
};

/** Build's home: the landing, or the person's own home once they have a build. */
export function HomeView({ view, projects, now = null, reading = false }: HomeViewProps) {
  return (
    <main
      className={cn(BUILD_COLUMN, reading && '[html[data-has-session]_&]:invisible')}
      data-build-home={view.kind}
      aria-busy={reading || undefined}
    >
      {view.kind === 'landing' ? (
        <HomeLanding projects={projects} agentConnected={view.agentConnected} />
      ) : (
        <HomeBuilder view={view} now={now} />
      )}
    </main>
  );
}
