'use client';

import { Check, Copy } from 'lucide-react';
import Link from 'next/link';
import { type MouseEvent, type RefObject, useEffect, useId, useRef, useState } from 'react';

import { badgeAlt, entityName, paramsOf } from '../utils/badge-options';
import { type Style, styleQuery } from '../utils/builder-state';
import { badgeImageUrl, entityPageUrl, SNIPPET_FORMATS, type SnippetFormat, snippetOf } from '../utils/snippets';
import { BadgeImage, usePageTheme } from './badge-image';
import type { BadgeDefinition } from '@/badge/v3/catalogue';
import type { EntityFacts } from '@/badge/v3/facts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SITE_URL } from '@/lib/seo/site';

type EmbedStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  facts: EntityFacts;
  badge: BadgeDefinition;
  style: Style;
  now: Date;
  editHref: string;
  onEdit: () => void;
};

/** Step 4: the code in three forms, Copy, Edit (back to step 3) and the gallery. */
export function EmbedStep({ headingRef, facts, badge, style, now, editHref, onEdit }: Readonly<EmbedStepProps>) {
  const theme = usePageTheme();
  const ids = useId();
  const [format, setFormat] = useState<SnippetFormat>('markdown');
  const [copied, setCopied] = useState<SnippetFormat | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [origin, setOrigin] = useState(SITE_URL);

  useEffect(() => {
    if (!SITE_URL) setOrigin(window.location.origin);
    return () => window.clearTimeout(timer.current);
  }, []);

  const params = paramsOf(badge, style);
  const name = entityName(facts);
  const snippet = {
    imageUrl: badgeImageUrl(origin, facts.kind, name, badge.id, styleQuery(badge, style)),
    pageUrl: entityPageUrl(origin, facts.kind, name, params?.scope),
    alt: badgeAlt(facts, badge, style, now),
    auto: (params?.scheme ?? 'auto') === 'auto',
  };

  const copy = async (which: SnippetFormat) => {
    const code = snippetOf(which, snippet);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(which);
    } catch {
      // Without clipboard access the code is selected, ready for the visitor's own copy.
      const node = document.getElementById(`${ids}-${which}`);
      const selection = window.getSelection();
      if (node && selection) {
        selection.selectAllChildren(node);
      }
      return;
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 2000);
  };

  const edit = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onEdit();
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`${ids}-heading`}>
      <h2 id={`${ids}-heading`} ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        Copy the code
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="min-w-0 max-w-full">
          <BadgeImage facts={facts} badge={badge} style={style} theme={theme} alt={snippet.alt} />
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={editHref} onClick={edit}>
            Edit<span className="sr-only"> the badge style</span>
          </a>
        </Button>
      </div>

      <Tabs value={format} onValueChange={(value) => setFormat(value as SnippetFormat)}>
        <TabsList aria-label="Code format">
          {SNIPPET_FORMATS.map(({ value, name: label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SNIPPET_FORMATS.map(({ value, name: label }) => (
          <TabsContent key={value} value={value} className="flex flex-col gap-3">
            <pre className="max-w-full overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-[13px] leading-5 whitespace-pre-wrap break-all">
              <code id={`${ids}-${value}`}>{snippetOf(value, snippet)}</code>
            </pre>
            <p className="text-xs text-muted-foreground">
              {value === 'markdown' &&
                (snippet.auto
                  ? 'Auto colors follow the reader’s system theme. On GitHub, pick HTML: it follows GitHub’s own theme.'
                  : 'Paste it into a README or any page that takes Markdown.')}
              {value === 'html' &&
                (snippet.auto
                  ? 'A light and a dark image in <picture>, so the badge follows the page’s theme on GitHub.'
                  : 'For GitHub READMEs and any page that takes HTML.')}
              {value === 'url' && 'The image alone, for anywhere that takes an image link.'}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href="/badge/gallery" className="text-sm font-medium text-link underline-offset-2 hover:underline">
                See all badges
              </Link>
              <Button type="button" onClick={() => copy(value)} className="min-w-28">
                {copied === value ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied === value ? 'Copied' : `Copy ${label}`}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <p aria-live="polite" className="sr-only">
        {copied ? 'Copied to the clipboard' : ''}
      </p>
    </section>
  );
}
