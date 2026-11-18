'use client';

import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { reportHeroHit } from '@/lib/unsung-hero/use-unsung-hero';

/**
 * "Star on GitHub": a plain link to the repository on GitHub, in a new tab. Nothing stars through us; a press is counted
 * once per visitor a day, and not at all where `report` is false (a maintainer's preview).
 */
export function StarOnGitHub({ nameWithOwner, report = true }: Readonly<{ nameWithOwner: string; report?: boolean }>) {
  return (
    <Button variant="outline" asChild className="max-sm:min-h-11">
      <a
        href={`https://github.com/${nameWithOwner}`}
        target="_blank"
        rel="noopener"
        onClick={report ? () => reportHeroHit({ kind: 'github', repo: nameWithOwner }) : undefined}
      >
        <Star aria-hidden="true" />
        Star on GitHub
      </a>
    </Button>
  );
}
