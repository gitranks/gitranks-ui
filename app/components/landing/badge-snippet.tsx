'use client';

import { CopyIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

const EXAMPLE_LOGIN = 'torvalds';

/** The badge snippet: the signed-in visitor's own, an example otherwise. */
export const BadgeSnippet = ({ origin }: { origin: string }) => {
  const { data: session } = useSession();
  const login = session?.user?.githubLogin ?? EXAMPLE_LOGIN;
  const own = Boolean(session?.user?.githubLogin);
  const snippet = `<a href="${origin}/profile/${login}"><img src="${origin}/badges/${login}/stars-rank.svg" alt="GitRanks badge for ${login}" /></a>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success('Badge copied. Paste it into your README.');
    } catch {
      toast.error('Copy failed. Select the snippet and copy it by hand.');
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <span className="text-xs text-muted-foreground">
        {own ? 'Your stars rank badge' : `Example for @${EXAMPLE_LOGIN}. Sign in or open your profile to get yours.`}
      </span>
      <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-[13px] leading-5">
        <code>{snippet}</code>
      </pre>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={copy}>
          <CopyIcon />
          Copy badge
        </Button>
        <Link
          href={(own ? `/badge/builder?user=${encodeURIComponent(login)}` : '/badge/builder?user=') as Route}
          prefetch={false}
          className="text-sm text-link underline"
        >
          Customize in the builder
        </Link>
      </div>
    </div>
  );
};
