import { ArrowUpRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { McpInstallLink } from '@/lib/workspace/mcp-install-links';

/** A client's install link as our own button: it opens the client, which asks to confirm before it adds anything. */
export function InstallButton({ link }: { link: McpInstallLink }) {
  return (
    <Button asChild variant="outline" className="min-h-11 self-start px-4 font-semibold sm:min-h-9" data-install-link>
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label}
        <ArrowUpRight aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Button>
  );
}
