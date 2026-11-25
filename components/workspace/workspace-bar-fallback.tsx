import { cn } from '@/lib/utils';
import type { WorkspaceTab } from '@/lib/workspace/gate';
import { WORKSPACE_TABS } from '@/lib/workspace/workspace-tabs';

/** The four tabs the workspace's bar draws, in its order (`tabsOf`). */
export const FALLBACK_TABS: readonly WorkspaceTab[] = ['contribute', 'pull-requests', 'agent', 'settings'];

/**
 * Each tab's weight while the guess names it current (`data-bar-guess-tab`, `lib/workspace/workspace-bar-guess.ts`): whole
 * class names, so the styles are built.
 */
const CURRENT: Record<WorkspaceTab, string> = {
  contribute:
    '[html[data-bar-guess-tab=contribute]_&]:border-foreground [html[data-bar-guess-tab=contribute]_&]:font-semibold [html[data-bar-guess-tab=contribute]_&]:text-foreground',
  'pull-requests':
    '[html[data-bar-guess-tab=pull-requests]_&]:border-foreground [html[data-bar-guess-tab=pull-requests]_&]:font-semibold [html[data-bar-guess-tab=pull-requests]_&]:text-foreground',
  agent:
    '[html[data-bar-guess-tab=agent]_&]:border-foreground [html[data-bar-guess-tab=agent]_&]:font-semibold [html[data-bar-guess-tab=agent]_&]:text-foreground',
  settings:
    '[html[data-bar-guess-tab=settings]_&]:border-foreground [html[data-bar-guess-tab=settings]_&]:font-semibold [html[data-bar-guess-tab=settings]_&]:text-foreground',
};

const TAB = 'relative inline-block whitespace-nowrap px-3 pb-4 sm:px-4 border-b-2 rounded-t-lg border-transparent';

/**
 * The bar's place while the workspace's tabs are read: the four tab names in their places, with no counts and the
 * current one marked, so the arriving bar changes nothing but the counts and the door. Shown only while the browser
 * guesses the tabs will show (`data-bar-guess`, set by the head's script and again on each move by
 * `WorkspaceBarGuess`); otherwise the header's line, as before. Drawn for everyone, so the shell stays prerendered.
 * `shown` draws it as a guess that said yes, for the design catalogue.
 */
export function WorkspaceBarFallback({ shown }: { shown?: { current: WorkspaceTab | null } }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn('border-b', shown ? 'hidden' : '[html[data-bar-guess]_&]:hidden')}
        data-bar-fallback-line=""
      />
      <div
        aria-hidden="true"
        className={cn(
          'text-sm text-center text-muted-foreground border-b',
          shown ? 'block' : 'hidden [html[data-bar-guess]_&]:block',
        )}
        data-bar-fallback=""
      >
        <ul className="mx-auto m-0 flex w-full max-w-7xl -mb-px list-none overflow-x-hidden p-0">
          {FALLBACK_TABS.map((tab) => (
            <li key={tab} className="shrink-0 sm:me-2">
              <span
                className={cn(
                  TAB,
                  shown?.current === tab ? 'border-foreground font-semibold text-foreground' : CURRENT[tab],
                )}
                data-fallback-tab={tab}
              >
                {WORKSPACE_TABS[tab].label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
