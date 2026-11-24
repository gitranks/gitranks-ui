import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Pill } from '@/components/pill/pill';
import { buttonVariants } from '@/components/ui/button';
import { HEADING } from '@/components/workspace/primitives';
import { cn } from '@/lib/utils';
import { GETTING_IN_PATHS, MCP_DOCS_PATH, PICK_ISSUE_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';

const link = 'font-semibold text-link hover:underline';

/** One fact of a way: what it is about, and the answer. */
type Fact = { label: string; text: string };

/** One way of doing the work, as a card: its name, its facts, and its one button. */
function WayCard({
  title,
  recommended = false,
  facts,
  extra,
  button,
}: {
  title: string;
  recommended?: boolean;
  facts: readonly Fact[];
  extra?: ReactNode;
  button: { label: string; href: Route; primary: boolean };
}) {
  return (
    <section
      aria-label={title}
      data-agent-way={recommended ? 'own' : 'hosted'}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-5',
        recommended ? 'border-2 border-primary' : 'border',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={HEADING.card}>{title}</h2>
        {recommended ? <Pill tone="violet">Recommended</Pill> : null}
      </div>
      <dl className="flex flex-col gap-3">
        {facts.map(({ label, text }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{text}</dd>
          </div>
        ))}
      </dl>
      {extra}
      <Link
        href={button.href}
        prefetch={false}
        className={cn(
          buttonVariants({ variant: button.primary ? 'default' : 'outline' }),
          'mt-auto min-h-11 self-start px-5 font-semibold max-sm:w-full',
        )}
      >
        {button.label}
      </Link>
    </section>
  );
}

/**
 * The Agent tab with nothing connected (`agent-tab-first`): the two ways side by side (stacked on a phone), the
 * person's own agent first and recommended, then the one line on what comes next. For an account that has entered the
 * buttons lead to the Agent tab's own connect and key pages; for one that has not, into Contribute's flow.
 */
export function AgentFirst({ entered }: { entered: boolean }) {
  const own: Fact[] = [
    { label: 'Where it runs', text: 'On your computer: Claude Code, Codex CLI, Cursor, Gemini CLI and others.' },
    { label: 'What it costs', text: 'Nothing here. It works with the plan you already pay for.' },
    { label: 'What it is for', text: 'Contribute and Learn' },
    { label: 'Setup', text: 'About a minute' },
  ];
  const hosted: Fact[] = [
    { label: 'Where it runs', text: 'On our side, for you. Your computer can be off.' },
    { label: 'What it costs', text: 'Your Claude API key pays, within a monthly budget you set.' },
    { label: 'What it is for', text: 'Contribute only. Learn always uses your own agent.' },
    { label: 'Setup', text: 'A Claude API key and a budget' },
  ];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2" data-agent-first={entered ? 'entered' : 'not-entered'}>
        <WayCard
          title="Your own agent"
          recommended
          facts={own}
          extra={
            <Link href={MCP_DOCS_PATH} prefetch={false} className={cn(link, 'self-start text-sm')}>
              Setup and tools: the MCP docs →
            </Link>
          }
          button={{
            label: 'Connect your agent',
            href: entered ? WORKSPACE_PATHS.agentConnect : GETTING_IN_PATHS.contributeAgentOwn,
            primary: true,
          }}
        />
        <WayCard
          title="Hosted agent"
          facts={hosted}
          button={{
            label: 'Use a Claude key',
            href: entered ? WORKSPACE_PATHS.agentKey : GETTING_IN_PATHS.contributeAgentKey,
            primary: false,
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground" data-agent-first-next="">
        {!entered ? (
          'Then you pick your first issue.'
        ) : (
          <>
            Next, pick an issue on{' '}
            <Link href={WORKSPACE_PATHS.contribute} prefetch={false} className={link}>
              Contribute
            </Link>{' '}
            or{' '}
            <Link href={PICK_ISSUE_PATHS.learn} prefetch={false} className={link}>
              Learn
            </Link>{' '}
            and press Start. You can set up the other way later.
          </>
        )}
      </p>
    </>
  );
}
