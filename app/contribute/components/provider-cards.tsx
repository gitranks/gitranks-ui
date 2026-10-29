'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { noteProviderInterest } from '../actions';
import type { ContributeComingSoonProvider } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { COMING_SOON } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

const cardClass = 'flex min-w-0 flex-col gap-2.5 rounded-xl border p-4';

/** Claude, live, and the providers that are coming, each with a "Notify me" that counts towards which comes next. */
export function ProviderCards({ compact = false }: { compact?: boolean }) {
  const [noted, setNoted] = useState<ReadonlySet<ContributeComingSoonProvider>>(new Set());
  const [pending, startTransition] = useTransition();

  const notify = (provider: ContributeComingSoonProvider) =>
    startTransition(async () => {
      const result = await noteProviderInterest(provider);
      if (result.ok) {
        setNoted((current) => new Set(current).add(provider));
      } else {
        toast.error(contributeErrorMessage(result.error, result.message));
      }
    });

  return (
    <div className={cn('grid gap-3.5', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4')}>
      <div className={cn(cardClass, 'border-primary border-[1.5px] bg-violet-50/60 dark:bg-violet-950/30')}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">Claude API key</span>
          <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">Live</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Max and Team monthly credits, run on Anthropic's hosted agents
        </span>
        {compact ? null : (
          <Link href="/contribute/connect" prefetch={false} className="text-sm font-semibold text-primary">
            Connect →
          </Link>
        )}
      </div>
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">Your own agent</span>
          <SoonPill />
        </div>
        <span className="text-sm text-muted-foreground">
          Claude Code, Codex, Cursor or Gemini CLI on your machine, through our MCP server
        </span>
        <span className="text-sm text-muted-foreground">Coming soon</span>
      </div>
      {COMING_SOON.map(({ provider, title, text }) => {
        const done = noted.has(provider);
        return (
          <div key={provider} className={cardClass}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{title}</span>
              <SoonPill />
            </div>
            <span className="text-sm text-muted-foreground">{text}</span>
            <button
              type="button"
              disabled={done || pending}
              onClick={() => notify(provider)}
              className="self-start rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-default disabled:opacity-70"
            >
              {done ? "We'll let you know" : 'Notify me'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SoonPill() {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Soon</span>;
}
