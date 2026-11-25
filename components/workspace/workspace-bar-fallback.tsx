import { cn } from '@/lib/utils';

/** The four tabs the workspace's bar draws, in its order. */
export const FALLBACK_TABS = [
  { tab: 'contribute', label: 'Contribute' },
  { tab: 'pull-requests', label: 'Pull requests' },
  { tab: 'agent', label: 'Agent' },
  { tab: 'settings', label: 'Settings' },
] as const;

export type FallbackTab = (typeof FALLBACK_TABS)[number]['tab'];

/**
 * The attributes a script in the head sets on `<html>` before the first paint, from the page's address and two cookies
 * the site already sets: `data-bar-guess` when the page will most likely draw the workspace's tabs, and
 * `data-bar-guess-tab` naming the current one.
 */
export const BAR_GUESS_ATTRIBUTES = { shown: 'data-bar-guess', tab: 'data-bar-guess-tab' } as const;

/** Each tab's weight while the attribute names it current: whole class names, so the styles are built. */
const CURRENT: Record<FallbackTab, string> = {
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
 * current one marked, so the arriving bar changes nothing but the counts and the door. Hidden unless the head's script
 * guessed that the tabs will show; then the header's line shows instead, as before. Drawn for everyone, so the shell
 * stays prerendered. `shown` draws it as a guess that said yes, for the design catalogue.
 */
export function WorkspaceBarFallback({ shown }: { shown?: { current: FallbackTab | null } }) {
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
          {FALLBACK_TABS.map(({ tab, label }) => (
            <li key={tab} className="shrink-0 sm:me-2">
              <span
                className={cn(
                  TAB,
                  shown?.current === tab ? 'border-foreground font-semibold text-foreground' : CURRENT[tab],
                )}
                data-fallback-tab={tab}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
