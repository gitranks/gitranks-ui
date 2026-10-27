'use client';

import { Check, Clipboard } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getStarHistoryBadgePath, getStarHistoryBadgeSnippets } from '../utils/star-history-badge';
import { Eyebrow, ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import { Button } from '@/components/ui/button';

const CopySnippet: FC<{ label: string; code: string }> = ({ label, code }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed. Select the snippet and copy it by hand.');
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>{label}</Eyebrow>
        <Button type="button" variant="ghost" size="sm" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check /> : <Clipboard />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <span className="sr-only" aria-live="polite">
          {copied ? `${label} copied` : ''}
        </span>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs leading-5">
        <code>{code}</code>
      </pre>
    </div>
  );
};

type StarHistoryBadgeSectionProps = { owner: string; name: string };

export const StarHistoryBadgeSection: FC<StarHistoryBadgeSectionProps> = ({ owner, name }) => {
  const { markdown, html } = getStarHistoryBadgeSnippets(owner, name);

  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-col gap-1">
        <ProfileCardHeader>Star history badge</ProfileCardHeader>
        <p className="text-sm text-muted-foreground">Show this chart in a README or on your site.</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic badge endpoint */}
      <img
        src={getStarHistoryBadgePath(owner, name)}
        alt={`Star history of ${owner}/${name}`}
        className="w-full max-w-lg h-auto rounded-md border"
        loading="lazy"
      />
      <CopySnippet label="Markdown" code={markdown} />
      <CopySnippet label="HTML" code={html} />
    </ProfileCard>
  );
};
