import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/workspace/code-block';
import { CONTACT_EMAIL } from '@/lib/legal';
import { AGENT_FIRST_PROMPT } from '@/lib/workspace/mcp-setup';
import { GETTING_IN_PATHS, MCP_DOCS_PATH } from '@/lib/workspace/paths';

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

/** Said once the agent is allowed by a person who has gone through neither onboarding, while the page stays. */
export const AUTHORIZE_SETUP_LINE =
  'Your agent is connected. One step left before it can take an issue: a 2-minute setup that shows how you approve its pull requests.';

const BACK_LINE = 'Started on gitranks.com? Go back to that tab: it moves on by itself.';

/**
 * What a person who has gone through neither onboarding does once the agent is allowed: "Finish setting up", to
 * Contribute's first step (which shows the agent connected), and the line for a person who began on its connect page.
 */
export function AuthorizeSetupStep() {
  return (
    <div className="flex flex-col items-start gap-3 text-sm" data-authorize-setup="">
      <Button asChild className="min-h-11 px-5 font-semibold">
        <Link href={GETTING_IN_PATHS.contributeStart} prefetch={false} data-authorize="finish-setup">
          Finish setting up
        </Link>
      </Button>
      <p className="text-muted-foreground" data-authorize-back="">
        {BACK_LINE}
      </p>
    </div>
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
      <p className="text-muted-foreground" data-authorize-back="">
        {BACK_LINE}
      </p>
      <p className="text-muted-foreground">
        It shows you a few issues to choose from. While autopilot is off, each pull request waits for your approval at{' '}
        <Link href="/contribute" prefetch={false} className={LINK}>
          gitranks.com/contribute
        </Link>
        .
      </p>
      <AuthorizeDocsLine />
    </div>
  );
}
