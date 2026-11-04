'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type PrFeedbackFlow, parsePrLink, reportPathOf } from '@/lib/contribute/pr-feedback';
import { CONTACT_EMAIL } from '@/lib/legal';

/** "Tell us how a PR went": a pull request's link, then "This PR helped" or "Report this PR" (each signs in first). */
export function PrLinkForm({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  const go = (flow: PrFeedbackFlow) => {
    const pr = parsePrLink(value);
    if (!pr) {
      setError('Paste a pull request’s link, like https://github.com/owner/repo/pull/123, or owner/repo#123.');
      return;
    }
    setError(null);
    router.push(reportPathOf({ pr }, flow));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        go('report');
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>Pull request</Label>
        <Input
          id={id}
          name="pr"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="max-sm:min-h-11"
        />
        {error ? (
          <p id={`${id}-error`} data-error="" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="lg" className="max-sm:min-h-11" onClick={() => go('helped')}>
          This PR helped
        </Button>
        <Button type="submit" variant="ghost" size="lg" className="max-sm:min-h-11">
          Report this PR
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Both ask you to sign in with GitHub. Rather write?{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-link hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </form>
  );
}
