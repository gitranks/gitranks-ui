import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

type Way = {
  eyebrow: string;
  title: string;
  text: string;
  spends: string;
  setup: string;
  button: string;
  href: typeof GETTING_IN_PATHS.contributeAgentOwn;
  source: ContributeSource;
  primary: boolean;
};

/** The two ways, your own agent first: it is the recommended one. */
const WAYS: Way[] = [
  {
    eyebrow: 'Recommended',
    title: 'Your own agent',
    text: 'Claude Code, Codex, Cursor, Gemini CLI or Antigravity fixes the issue on your computer and hands the change back for your review here.',
    spends: 'Nothing through us: your agent, your plan',
    setup: 'About a minute',
    button: 'Connect your agent',
    href: GETTING_IN_PATHS.contributeAgentOwn,
    source: 'contribute_flow_own',
    primary: true,
  },
  {
    eyebrow: 'No terminal needed',
    title: 'Hosted agent on your Claude key',
    text: 'We run Claude for you and bring you a tested change to review. Best if your plan has API credits that expire unused.',
    spends: 'Your API credits, within the caps you set',
    setup: 'About two minutes',
    button: 'Use a Claude key',
    href: GETTING_IN_PATHS.contributeAgentKey,
    source: 'contribute_flow_key',
    primary: false,
  },
];

/**
 * Who does the work, step 2 of Contribute's flow: the two ways as cards, each with what it spends, how long its setup
 * takes and its one button. For a visitor (`enabled` false) the cards are dimmed and their buttons off: the sign-in card
 * above them comes first.
 */
export function AgentChoice({ enabled }: { enabled: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-agent-choice={enabled ? 'on' : 'off'}>
      {WAYS.map((way) => (
        <section
          key={way.title}
          aria-labelledby={`way-${way.source}`}
          aria-disabled={enabled ? undefined : true}
          className={cn(
            'flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm sm:p-6 dark:shadow-none',
            !enabled && 'opacity-60',
          )}
        >
          <span className="text-xs font-semibold text-primary">{way.eyebrow}</span>
          <h2 id={`way-${way.source}`} className="text-lg font-semibold">
            {way.title}
          </h2>
          <p className="text-sm text-muted-foreground">{way.text}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">It spends</dt>
            <dd>{way.spends}</dd>
            <dt className="text-muted-foreground">Setup</dt>
            <dd>{way.setup}</dd>
          </dl>
          <div className="mt-auto pt-2">
            {enabled ? (
              <Button
                asChild
                variant={way.primary ? 'default' : 'outline'}
                className="min-h-11 px-4 font-semibold max-sm:w-full"
              >
                <Link href={way.href} prefetch={false} {...contributeSource(way.source)}>
                  {way.button}
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled className="min-h-11 px-4 font-semibold max-sm:w-full">
                {way.button}
              </Button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
