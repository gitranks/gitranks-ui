import Link from 'next/link';

import { CodeBlock } from './code-block';
import { MCP_DOCS_PATH } from '@/lib/contribute/contribute-path';
import { AGENT_FIRST_PROMPT } from '@/lib/contribute/mcp-setup';
import { CONTACT_EMAIL } from '@/lib/legal';

const LINK = 'font-semibold text-link hover:underline';

/** Setup help: the MCP docs, each agent's setup and what to check when it does not connect. */
export function AuthorizeDocsLine({ contact = false }: { contact?: boolean }) {
  return (
    <p className="text-sm text-muted-foreground" data-authorize-help>
      Setting it up?{' '}
      <Link href={MCP_DOCS_PATH} prefetch={false} className={LINK}>
        The MCP docs
      </Link>{' '}
      show each agent&apos;s setup
      {contact ? (
        <>
          . Questions:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
            {CONTACT_EMAIL}
          </a>
        </>
      ) : null}
      .
    </p>
  );
}

/**
 * What to do once the agent is allowed: the prompt to ask it, that each pull request waits for the user's approval on
 * Contribute, and the docs. A web client goes back at once; a desktop or CLI client's user stays on this page.
 */
export function AuthorizeNextStep({ clientName }: { clientName?: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm" data-authorize-next>
      <p className="font-semibold">Then ask it:</p>
      <CodeBlock label={`Prompt for ${clientName ?? 'your agent'}`} copyLabel="Copy the prompt" wrap>
        {AGENT_FIRST_PROMPT}
      </CodeBlock>
      <p className="text-muted-foreground">
        It shows you a few issues to choose from. Each pull request waits for your approval at{' '}
        <Link href="/contribute" prefetch={false} className={LINK}>
          gitranks.com/contribute
        </Link>
        .
      </p>
      <AuthorizeDocsLine />
    </div>
  );
}
