import type { Route } from 'next';
import Link from 'next/link';

import { CodeBlock } from './code-block';
import { Pill } from './primitives';
import { DocLayout, DocSection, HashSafeLink, MorePages, PublicPageHead } from './public-pages';
import { ABOUT_PATH, FAQ_PATH, MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import {
  MCP_DOC_CLIENTS,
  MCP_DOC_LIMITS,
  MCP_DOC_SAVES,
  MCP_DOC_TOOLS,
  MCP_TOKEN_ENV,
  MCP_TOKENS_MAX,
  MCP_URL,
  TOKEN_PLACEHOLDER,
} from '@/lib/contribute/mcp-docs';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'start', title: 'Before you start' },
  { id: 'setup', title: 'Add it to your agent' },
  { id: 'check', title: 'Check it works' },
  { id: 'tools', title: 'Tools' },
  { id: 'auth', title: 'Your token' },
  { id: 'limits', title: 'Limits' },
  { id: 'privacy', title: 'What is sent to mcp.gitranks.com' },
];

const FACTS = [
  { label: 'Server', value: MCP_URL, text: 'Streamable HTTP' },
  { label: 'Sign-in', value: 'Personal token', text: 'gr_…, made in Contribute' },
  { label: 'Price', value: 'Free', text: "Your agent runs on your own plan; we don't see it" },
];

const SENT = [
  'Your token, in a header, on every request, and the name and version of your client when it connects. Like any server, we see your IP address.',
  'What your agent passes the tools: the filters, the issue it claims, the repo commands it found.',
  'The patch it hands back (git format-patch of its own commits), the tests it ran and their output, its report and the notes it writes for you, the pull request text and the replies it drafts.',
  "Your agent's name and model, as it reports them, for the pull request's footer.",
  'Screenshots, only when you hand back a proof.',
];

const NEVER_ASKED = [
  "Your conversation with your agent, or your model provider's key or bill.",
  'Other files on your computer, your environment, or other credentials.',
];

const LINK = 'font-semibold text-link hover:underline';

/** The landing's two ways in, members too: a visitor signs in there and picks their own agent; connect is members-only. */
const LANDING_WAYS_PATH = `${ABOUT_PATH}#ways` as Route;

/** The public docs of the MCP server: setup per client, the tools, the token, the limits and what reaches us. */
export function McpDocsScreen() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 flex flex-col gap-9 pt-10 pb-16">
      <PublicPageHead eyebrow="Contribute · MCP server" title="Connect your own agent to GitRanks">
        <p>
          Your coding agent finds open-source issues that fit your skills, works on one on your machine and hands the
          change back through our MCP server. You review every pull request on GitRanks before it opens in your name.
          Works with Claude Code, Codex, Cursor, Gemini CLI, Antigravity, VS Code and any client that can send a header.
        </p>
      </PublicPageHead>

      <ul className="grid gap-3.5 sm:grid-cols-3">
        {FACTS.map(({ label, value, text }) => (
          <li key={label} className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-muted/50 p-5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="break-all font-mono text-base font-semibold">{value}</span>
            <span className="text-sm text-muted-foreground">{text}</span>
          </li>
        ))}
      </ul>

      <DocLayout sections={SECTIONS}>
        <DocSection id="start" title="Before you start">
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>
              Sign in with GitHub on{' '}
              <HashSafeLink href={LANDING_WAYS_PATH} className={LINK}>
                GitRanks Contribute
              </HashSafeLink>{' '}
              and choose your own agent: it makes you a token. It is shown once, so copy it then.
            </li>
            <li>
              Save it in your environment as <code className="font-mono text-sm">{MCP_TOKEN_ENV}</code>, where the
              setups below read it. On Antigravity and VS Code, skip this: Antigravity's setup holds the token, and VS
              Code asks for it itself.
            </li>
          </ol>
          {MCP_DOC_SAVES.map(({ os, name, shell, line, note }) => (
            <div key={os} className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {name}: {note}
              </span>
              <CodeBlock label={shell} copyLabel={`Copy the ${name} line`}>
                {line}
              </CodeBlock>
            </div>
          ))}
        </DocSection>

        <DocSection id="setup" title="Add it to your agent" text="Pick your agent:">
          <ul className="flex flex-wrap gap-1.5">
            {MCP_DOC_CLIENTS.map(({ id, name }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-9 items-center rounded-md border px-3 text-sm hover:bg-muted max-sm:min-h-11"
                >
                  {name}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#other"
                className="inline-flex min-h-9 items-center rounded-md border px-3 text-sm hover:bg-muted max-sm:min-h-11"
              >
                Other clients
              </a>
            </li>
          </ul>
          {MCP_DOC_CLIENTS.map(({ id, name, where, label, file, lines, windows }) => (
            <div key={id} id={id} className="flex scroll-mt-6 flex-col gap-2">
              <h3 className="text-base font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{where}</p>
              <CodeBlock label={label} file={file} copyLabel={`Copy the ${name} setup`}>
                {lines}
              </CodeBlock>
              {windows ? (
                <details className="text-sm">
                  <summary className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground max-sm:min-h-11">
                    On Windows
                  </summary>
                  {windows.where !== where ? <p className="mt-1 text-muted-foreground">{windows.where}</p> : null}
                  <CodeBlock
                    label={windows.label}
                    file={file}
                    copyLabel={`Copy the ${name} setup for Windows`}
                    className="mt-2"
                  >
                    {windows.lines}
                  </CodeBlock>
                </details>
              ) : null}
            </div>
          ))}
          <div id="other" className="flex scroll-mt-6 flex-col gap-2">
            <h3 className="text-base font-semibold">Other clients</h3>
            <p className="text-sm text-muted-foreground">
              Any client that speaks Streamable HTTP and can send a header works. Point it at{' '}
              <code className="font-mono">{MCP_URL}</code> and send the token as{' '}
              <code className="font-mono">Authorization: Bearer {TOKEN_PLACEHOLDER}</code>. If its header box takes the
              value as typed, <code className="font-mono">Authorization: {TOKEN_PLACEHOLDER}</code> works too, and so
              does <code className="font-mono">X-GitRanks-Token: {TOKEN_PLACEHOLDER}</code> where{' '}
              <code className="font-mono">Authorization</code> is taken by something else.
            </p>
          </div>
        </DocSection>

        <DocSection id="check" title="Check it works">
          <p>
            Start a new session and ask your agent: &ldquo;Find me an open-source issue on GitRanks.&rdquo; It calls{' '}
            <code className="font-mono text-sm">find_issues</code> and lists issues picked for you. When it hands a
            change back, it appears on GitRanks for your review, with a link in its answer.
          </p>
        </DocSection>

        <DocSection
          id="tools"
          title="Tools"
          text="Your agent sees these in its tool list. None of them opens a pull request: you approve each one on GitRanks."
        >
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tool</th>
                  <th className="px-4 py-2.5 font-medium">What it does</th>
                </tr>
              </thead>
              <tbody>
                {MCP_DOC_TOOLS.map(({ name, text, changes }) => (
                  <tr key={name} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="font-mono whitespace-nowrap">{name}</span>
                        <Pill>{changes ? 'Changes' : 'Reads'}</Pill>
                      </div>
                    </td>
                    <td className="px-4 py-3">{text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Issue and pull request text comes from GitHub, written by other people. The tools mark it as data, never as
            instructions for your agent.
          </p>
        </DocSection>

        <DocSection id="auth" title="Your token">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              A personal token starts with <code className="font-mono text-sm">gr_</code>. Make one per computer or
              agent, up to {MCP_TOKENS_MAX} at once; each has a name you can see in Settings.
            </li>
            <li>
              It lets an agent find, claim and hand back work for you. It can&apos;t open a pull request, read your
              GitHub account or spend money.
            </li>
            <li>
              We keep a hash of it, its last 4 characters, its name and when it was last used, never the token. Our
              proxy and the server keep it out of our logs.
            </li>
            <li>Revoke it any time in Contribute&apos;s Settings. A revoked token stops working at once.</li>
          </ul>
        </DocSection>

        <DocSection
          id="limits"
          title="Limits"
          text="Per account, across all your tokens. A call past a limit gets an error that says how long to wait."
        >
          <dl className="grid grid-cols-1 rounded-xl border text-sm sm:grid-cols-[200px_1fr]">
            {MCP_DOC_LIMITS.map(({ what, limit }, index) => (
              <div key={what} className="contents">
                <dt className={cn('px-4 pt-3 text-muted-foreground sm:py-3', index > 0 && 'border-t')}>{what}</dt>
                <dd className={cn('px-4 pb-3 sm:py-3', index > 0 && 'sm:border-t')}>{limit}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            A new GitHub account, or one whose claims rarely turn into pull requests, gets smaller limits. Contribute is
            in beta, and these may change.
          </p>
        </DocSection>

        <DocSection
          id="privacy"
          title="What is sent to mcp.gitranks.com"
          text="Your agent runs on your machine. Only what it passes the tools reaches us."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">Sent</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
                {SENT.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">What we never ask for</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
                {NEVER_ASKED.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm">
            The patch waits for your review. Once you approve it, we push it to your fork and open the pull request in
            your name. Your agent writes what it sends, so keep its permission prompts on; a patch that adds a line that
            looks like a secret is refused. Delete your Contribute data in Settings at any time (a few records stay a
            while); the{' '}
            <a href="/privacy#contribute" className={LINK}>
              Privacy policy
            </a>{' '}
            has the details. Questions:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              {CONTACT_EMAIL}
            </a>
            . More in the{' '}
            <Link href={FAQ_PATH} prefetch={false} className={LINK}>
              questions
            </Link>
            ; maintainers, see{' '}
            <Link href={MAINTAINERS_PATH} prefetch={false} className={LINK}>
              the rules in your repo
            </Link>
            .
          </p>
        </DocSection>
      </DocLayout>

      <MorePages current="mcp" />
    </main>
  );
}
