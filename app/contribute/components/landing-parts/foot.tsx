import type { Route } from 'next';

import { LandingStartButton } from './start-button';
import { HashSafeLink } from '@/app/contribute/components/public-pages';
import { WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { cn } from '@/lib/utils';
import type { LandingStart } from '@/lib/workspace/getting-in';
import {
  AGENTS_DOC_PATH,
  CONTRIBUTE_TERMS_PATH,
  FAQ_PATH,
  MCP_DOCS_PATH,
  WORKSPACE_PATHS,
} from '@/lib/workspace/paths';

/** The landing's foot: the pages open to every visitor. `plain`: a file, not a page (a plain link, no router). */
const FOOT_LINKS: { href: Route; label: string; plain?: boolean }[] = [
  { href: WORKSPACE_PATHS.learnHome, label: 'GitRanks Learn' },
  { href: MCP_DOCS_PATH, label: 'MCP server docs' },
  { href: AGENTS_DOC_PATH as Route, label: 'For AI agents', plain: true },
  { href: FAQ_PATH, label: 'Questions' },
  { href: CONTRIBUTE_TERMS_PATH, label: 'Terms' },
];

const LINK = 'inline-flex items-center max-sm:min-h-11 text-muted-foreground hover:text-foreground hover:underline';

/** "Ready for your first issue?", the one button again, and the links. */
export function LandingFoot({ start }: { start: LandingStart }) {
  return (
    <section className="border-t" data-landing="foot">
      <div className={cn(WIDTH, 'flex flex-wrap items-center justify-between gap-5 pt-12 pb-16')}>
        <h2 className="text-2xl font-bold">Ready for your first issue?</h2>
        <div className="flex flex-wrap gap-3 max-sm:w-full">
          <LandingStartButton start={start} />
        </div>
        <nav aria-label="More about Contribute" className="basis-full">
          <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm">
            {FOOT_LINKS.map(({ href, label, plain }) => (
              <li key={href}>
                {plain ? (
                  <a href={href} className={LINK}>
                    {label}
                  </a>
                ) : (
                  <HashSafeLink href={href} className={LINK}>
                    {label}
                  </HashSafeLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
