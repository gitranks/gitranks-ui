'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import { ClipLoader } from 'react-spinners';

import { entityName } from '../utils/badge-options';
import { entityPageUrl } from '../utils/snippets';
import type { EntityFacts } from '@/badge/v3/facts';
import { Button } from '@/components/ui/button';

type Copy = { title: string; text: string; open: string };

/** What the note says for an entity waiting on a read (see `showsReadNote`). */
export function awaitingReadCopy(facts: EntityFacts): Copy | null {
  switch (facts.kind) {
    case 'repo':
      return {
        title: 'GitRanks hasn’t read this repository’s star history yet',
        text: 'This badge draws from it. Refresh on the repository’s page reads it from GitHub once you sign in there; then come back: this page checks again.',
        open: 'Sign in on its page and press Refresh',
      };
    case 'user':
      return {
        title: 'GitRanks is still reading this developer from GitHub',
        text: 'Their badges fill in when it is done. Their page shows how it goes; this page checks again when you come back.',
        open: 'Open their page',
      };
    case 'org':
      return null;
  }
}

type AwaitingReadNoteProps = {
  facts: EntityFacts;
  checking: boolean;
  /** Set after a check that found the entity still waiting. */
  stillUnread: boolean;
  onCheck: () => void;
};

/** The next step for an entity GitRanks has yet to read: its page, where a refresh reads it, and "Check again". */
export function AwaitingReadNote({ facts, checking, stillUnread, onCheck }: Readonly<AwaitingReadNoteProps>) {
  const copy = awaitingReadCopy(facts);
  if (!copy) return null;

  return (
    <section
      aria-labelledby="builder-awaiting-read"
      className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="builder-awaiting-read" className="text-sm font-semibold">
          {copy.title}
        </h2>
        <p className="text-sm text-muted-foreground">{copy.text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <a
            href={entityPageUrl('', facts.kind, entityName(facts))}
            target="_blank"
            rel="noopener"
            className="text-primary-foreground no-underline hover:text-primary-foreground"
          >
            {copy.open}
            <ExternalLink aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-disabled={checking}
          onClick={() => {
            if (!checking) onCheck();
          }}
          className="aria-disabled:cursor-wait aria-disabled:opacity-70"
        >
          {checking ? <ClipLoader size={14} color="currentColor" /> : <RefreshCw aria-hidden="true" />}
          {checking ? 'Checking…' : 'Check again'}
        </Button>
        {stillUnread && !checking && <p className="text-xs text-muted-foreground">Checked just now: not read yet.</p>}
      </div>
    </section>
  );
}
