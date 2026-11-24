import { ExternalLink } from 'lucide-react';

import { GITHUB_EMAIL_SETTINGS } from '@/lib/follow/follow-copy';
import { EMAIL_NEEDS_ADDRESS } from '@/lib/learn/settings';
import { cn } from '@/lib/utils';

/**
 * The line under a Learn email's switch while the person has no address: the email needs one, and the link to where
 * it is set (GitHub's email settings; the address is read again at the next sign-in).
 */
export function EmailNeedsAddress({ id, className }: { id?: string; className?: string }) {
  return (
    <span id={id} className={cn('block text-pretty text-foreground', className)} data-email-needs-address="">
      {EMAIL_NEEDS_ADDRESS.lead}{' '}
      <a
        href={GITHUB_EMAIL_SETTINGS}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-link hover:underline"
      >
        {EMAIL_NEEDS_ADDRESS.link}
        <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
      {EMAIL_NEEDS_ADDRESS.tail}
    </span>
  );
}
