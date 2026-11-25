import { ChevronRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { DocLayout, DocSection, MorePages, PublicPageHead } from './public-pages';
import { Pill } from '@/components/pill/pill';
import { buttonVariants } from '@/components/ui/button';
import { SetupClip } from '@/components/workspace/agent/setup-clip';
import { CodeBlock } from '@/components/workspace/code-block';
import { InstallButton } from '@/components/workspace/install-button';
import { OpenOnHash } from '@/components/workspace/open-on-hash';
import {
  EXAMPLE_BRIEF,
  EXAMPLE_BRIEF_CLAIMED_ON,
  EXAMPLE_BRIEF_ISSUE,
  EXAMPLE_BRIEF_PR,
} from '@/lib/contribute/example-brief';
import {
  AGENT_FIRST_PROMPT,
  CLAUDE_APP_DOC,
  MCP_DOC_CHECKS,
  MCP_DOC_CLIENTS,
  MCP_DOC_LIMITS,
  MCP_DOC_LIMITS_NOTE,
  MCP_DOC_MORE_CLIENTS,
  MCP_DOC_NEXT_STEPS,
  MCP_DOC_PLUGINS,
  MCP_DOC_SAVES,
  MCP_DOC_SETUP_FIRST,
  MCP_DOC_SIGN_INS,
  MCP_DOC_TOOLS,
  MCP_DOC_TROUBLES,
  MCP_PLUGIN_DOCS_SHOWN,
  MCP_PLUGIN_ISSUES_URL,
  MCP_REMOTE_BRIDGE,
  MCP_TOKEN_ENV,
  MCP_TOKENS_MAX,
  MCP_URL,
  type McpDocClient,
  type McpDocPlugin,
  type McpDocSignIn,
  type McpDocTrouble,
  OR_INSTALL_THE_PLUGIN,
  TOKEN_PLACEHOLDER,
} from '@/lib/contribute/mcp-docs';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';
import { MCP_INSTALL_LINKS, mcpInstallLinkOf } from '@/lib/workspace/mcp-install-links';
import { USE_A_TOKEN_INSTEAD } from '@/lib/workspace/mcp-setup';
import { AGENTS_DOC_PATH, FAQ_PATH, MAINTAINERS_PATH, START_AGENT_PATH } from '@/lib/workspace/paths';

const SECTIONS = [
  { id: 'start', title: 'Before you start' },
  { id: 'setup', title: 'Add it to your agent' },
  { id: 'check', title: 'Check it works' },
  { id: 'troubleshooting', title: 'Troubleshooting' },
  { id: 'tools', title: 'Tools' },
  { id: 'brief', title: 'What claim_issue answers' },
  { id: 'auth', title: 'Sign-in and tokens' },
  { id: 'limits', title: 'Limits' },
  { id: 'privacy', title: 'What is sent to mcp.gitranks.com' },
  { id: 'help', title: 'Help' },
];

const FACTS = [
  { label: 'Server', value: MCP_URL, text: 'Streamable HTTP' },
  {
    label: 'Sign-in',
    value: 'GitHub, in your browser',
    text: "or a personal token (gr_…), for a client that can't sign in",
  },
  { label: 'Price', value: 'Free', text: "Your agent runs on your own plan; we don't see it" },
];

/** One way to add GitRanks to a client: what to do, its lines, Windows' where they differ, then the line under them. */
function DocSetup({ name, setup }: { name: string; setup: McpDocSignIn }) {
  const { where, label, file, lines, after, windows } = setup;
  return (
    <>
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
      {after ? <p className="text-sm text-muted-foreground">{after}</p> : null}
    </>
  );
}

/** The plugin's install for a client, in a fold under its setup. */
function DocPlugin({ name, plugin }: { name: string; plugin: McpDocPlugin }) {
  return (
    <details className="text-sm" data-plugin>
      <summary className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground max-sm:min-h-11">
        {OR_INSTALL_THE_PLUGIN}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-muted-foreground">{plugin.where}</p>
        <CodeBlock label={plugin.label} copyLabel={`Copy the ${name} plugin install`}>
          {plugin.lines}
        </CodeBlock>
        {plugin.older ? (
          <>
            <p className="text-muted-foreground">{plugin.older.where}</p>
            <CodeBlock label={plugin.label} copyLabel={`Copy the ${name} plugin install for older versions`}>
              {plugin.older.lines}
            </CodeBlock>
          </>
        ) : null}
        <p className="text-muted-foreground">{plugin.after}</p>
      </div>
    </details>
  );
}

/**
 * A client's setup on the docs: its install link, its sign-in, the plugin where it has one (and `plugin`), and the
 * token setup in a fold under it; one that can only sign in (claude.ai) has no fold.
 */
function DocClient({ client, plugin }: { client: McpDocClient; plugin: boolean }) {
  const viaSignIn = MCP_DOC_SIGN_INS[client.id];
  const link = mcpInstallLinkOf(client.id);
  const viaPlugin = plugin ? MCP_DOC_PLUGINS[client.id] : undefined;
  return (
    <div id={client.id} className="flex scroll-mt-6 flex-col gap-2">
      <h3 className="text-base font-semibold">{client.name}</h3>
      {link ? <InstallButton link={link} /> : null}
      {viaSignIn ? (
        <>
          <DocSetup name={client.name} setup={viaSignIn} />
          {viaPlugin ? <DocPlugin name={client.name} plugin={viaPlugin} /> : null}
          <details className="text-sm" data-token-fold>
            <summary className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground max-sm:min-h-11">
              {USE_A_TOKEN_INSTEAD}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <DocSetup name={`${client.name} token`} setup={client} />
            </div>
          </details>
        </>
      ) : (
        <DocSetup name={client.name} setup={client} />
      )}
    </div>
  );
}

const SENT = [
  "The access token from your agent's sign-in, or your personal token, in a header on every request, and the name and version of your client when it connects. Like any server, we see your IP address.",
  'What your agent passes the tools: the filters, the issue it takes, the repo commands it found.',
  'The patch it hands back (git format-patch of its own commits), the tests it ran and their output, its report and the notes it writes for you, the pull request text and the replies it drafts.',
  "Your agent's name and model, as it reports them, for the pull request's footer.",
  'Screenshots, only when you hand back a proof.',
];

const NEVER_ASKED = [
  "Your conversation with your agent, or your model provider's key or bill.",
  'Other files on your computer, your environment, or other credentials.',
];

const LINK = 'font-semibold text-link hover:underline';

/** An address on this site in the docs' text ("gitranks.com/contribute"), linked to its page. */
const SITE_ADDRESS = /(gitranks\.com\/[a-z0-9/#_-]*[a-z0-9])/i;

/** A line of the docs' data, its addresses on this site linked. */
function SiteText({ text }: { text: string }) {
  return text.split(SITE_ADDRESS).map((part, index) =>
    index % 2 ? (
      <Link key={index} href={part.slice('gitranks.com'.length) as Route} prefetch={false} className={LINK}>
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

/** Problems as a list of terms: what goes wrong, then what to do. */
function Troubles({ troubles }: { troubles: readonly McpDocTrouble[] }) {
  return (
    <dl className="flex flex-col gap-3">
      {troubles.map(({ title, text }) => (
        <div key={title} className="flex flex-col gap-1">
          <dt className="font-semibold">{title}</dt>
          <dd className="text-muted-foreground">
            <SiteText text={text} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Where to go from the docs: connect (a visitor signs in first), and Contribute, where the reviews wait. */
function DocActions() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2" data-docs-actions>
      <Link
        href={START_AGENT_PATH}
        prefetch={false}
        className={cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5 text-base font-semibold max-sm:w-full')}
      >
        Connect your agent
      </Link>
      <Link
        href="/contribute"
        prefetch={false}
        className="inline-flex items-center font-semibold text-link hover:underline max-sm:min-h-11"
      >
        Review your pull requests on Contribute →
      </Link>
    </div>
  );
}

/** The example's whole answer as JSON, the brief's text left out: the text follows in a block of its own. */
const EXAMPLE_ANSWER = JSON.stringify(
  {
    status: 'claimed',
    attemptId: '…',
    leaseUntil: '… (24 hours on)',
    brief: {
      ...EXAMPLE_BRIEF,
      text: `(the text below, ${EXAMPLE_BRIEF.text.length.toLocaleString('en-US')} characters)`,
    },
  },
  null,
  2,
);

/** The day it was claimed, in words: "3 November 2026". */
const EXAMPLE_CLAIMED_ON = new Date(`${EXAMPLE_BRIEF_CLAIMED_ON}T00:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A real answer of `claim_issue`, folded: the issue and its merged pull request linked, then the JSON and the text. */
function ExampleBrief() {
  return (
    <>
      <p>
        When your agent takes an issue, the answer holds the issue and its thread, our triage, the pull requests already
        on it, the repository&apos;s notes and conventions, and how to do the work and hand it back. Below is a real
        one: what an agent read when it took{' '}
        <a href={EXAMPLE_BRIEF_ISSUE.url} className={LINK}>
          {EXAMPLE_BRIEF_ISSUE.name}
        </a>{' '}
        on {EXAMPLE_CLAIMED_ON}. A maintainer had just invited an earlier volunteer to open the pull request; with no
        reply, the maintainers went ahead with the one that came of it,{' '}
        <a href={EXAMPLE_BRIEF_PR.url} className={LINK}>
          {EXAMPLE_BRIEF_PR.name}
        </a>
        , and merged it. GitHub logins are replaced by &ldquo;someone&rdquo;, and the long texts are cut.
      </p>
      <details className="text-sm" data-example-brief>
        <summary className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground max-sm:min-h-11">
          Show the answer
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          {/* The answer keeps the tool's own words ("claim"): the page's "take" stops at this fold (issue-rules-words.spec). */}
          <p className="text-muted-foreground" data-example-verbatim>
            This is the answer of the tool <code>claim_issue</code> exactly as your agent gets it, so it keeps the
            tool&apos;s own words.
          </p>
          <CodeBlock label="claim_issue's answer (JSON)" copyLabel="Copy the example answer">
            {EXAMPLE_ANSWER}
          </CodeBlock>
          <CodeBlock label="brief.text" copyLabel="Copy the example brief's text" wrap tall="The example brief's text">
            {EXAMPLE_BRIEF.text}
          </CodeBlock>
        </div>
      </details>
    </>
  );
}

/** The clients the docs list: the connect flow's, then claude.ai (which can only sign in), then VS Code. */
const CLIENTS = [...MCP_DOC_CLIENTS.slice(0, -1), CLAUDE_APP_DOC, ...MCP_DOC_CLIENTS.slice(-1)];

/** A client from "More clients": sign-in only, its install link where it has one. */
function MoreClient({ client }: { client: McpDocClient }) {
  const link = mcpInstallLinkOf(client.id);
  return (
    <div id={client.id} className="flex scroll-mt-6 flex-col gap-2">
      <h3 className="text-base font-semibold">{client.name}</h3>
      {link ? <InstallButton link={link} /> : null}
      <DocSetup name={client.name} setup={client} />
    </div>
  );
}

const CHIP = 'inline-flex min-h-9 items-center rounded-md border px-3 text-sm hover:bg-muted max-sm:min-h-11';

/** Names as a sentence: "A, B and C". */
const andList = (names: string[]) => `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/** The names in "More clients", for its summary. */
const MORE_CLIENT_NAMES = andList(MCP_DOC_MORE_CLIENTS.map(({ name }) => name));

/** The install links' clients, by name: "Claude, Cursor, VS Code and Kiro". */
const INSTALL_LINK_NAMES = andList(MCP_INSTALL_LINKS.map(({ label }) => label.replace(/^Add to /, '')));

/**
 * The public docs of the MCP server: setup per client, the first prompt and what happens next, troubleshooting, the
 * tools, the sign-in and the token, the limits, what reaches us and where to get help. Agents sign in with GitHub, so each client's sign-in comes first and its token setup sits in a fold.
 * `plugin`: show the plugin installs (`MCP_PLUGIN_DOCS_SHOWN`, on since the plugin's repository went public).
 */
export function McpDocsScreen({ plugin = MCP_PLUGIN_DOCS_SHOWN }: { plugin?: boolean } = {}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 flex flex-col gap-9 pt-10 pb-16">
      <PublicPageHead eyebrow="Contribute · MCP server" title="Connect your own agent to GitRanks">
        <p>
          Your coding agent finds open-source issues that fit your skills, works on one on your machine and hands the
          change back through our MCP server. You review every pull request on GitRanks before it opens in your name.
          Your agent signs in with your GitHub account, and you allow it on GitRanks. Works with Claude Code, Codex,
          Cursor, Gemini CLI, VS Code, claude.ai, Claude Desktop, Antigravity, Copilot CLI, Kiro, Zed and any client
          that can sign in to an MCP server or send a header.
        </p>
        <p className="text-sm text-muted-foreground">
          For AI agents: the same in markdown at{' '}
          <a href={AGENTS_DOC_PATH} className="font-mono text-link hover:underline">
            {AGENTS_DOC_PATH}
          </a>
          .
        </p>
      </PublicPageHead>

      <DocActions />

      <SetupClip />

      {/* A list of terms, each line its own block, so a copy of the page's text keeps them apart. */}
      <dl className="grid gap-3.5 sm:grid-cols-3">
        {FACTS.map(({ label, value, text }) => (
          <div key={label} className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-muted/50 p-5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-all font-mono text-base font-semibold">{value}</dd>
            <dd className="text-sm text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>

      <DocLayout sections={SECTIONS}>
        <DocSection id="start" title="Before you start">
          <p data-sign-in-start>
            Your agent signs in with your GitHub account. Add GitRanks to it below and sign in as its setup says: your
            browser opens GitRanks, where you sign in with GitHub and press Allow. Nothing to copy, and nothing secret
            to keep. Every agent you connect is listed on Contribute&apos;s Agent tab, each with Disconnect.
          </p>
          <p data-setup-first>
            <SiteText text={MCP_DOC_SETUP_FIRST} />
          </p>
          <details className="text-sm" data-token-start>
            <summary className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground max-sm:min-h-11">
              {USE_A_TOKEN_INSTEAD}: for scripts, or a client that can&apos;t sign in
            </summary>
            <div className="mt-2 flex flex-col gap-3 text-base">
              <ol className="flex list-decimal flex-col gap-2 pl-5">
                <li>
                  Sign in with GitHub on{' '}
                  <Link href={START_AGENT_PATH} prefetch={false} className={LINK} data-token-connect="">
                    Connect your own agent
                  </Link>{' '}
                  and create a token there, in its &ldquo;{USE_A_TOKEN_INSTEAD}&rdquo; fold, or later under
                  &ldquo;Connect another agent&rdquo; on the Agent tab. Give it a name you will recognise. It is shown
                  once, so copy it then.
                </li>
                <li>
                  Save it in your environment as <code className="font-mono text-sm">{MCP_TOKEN_ENV}</code>, where the
                  token setups below read it. On Antigravity, skip this: its setup holds the token.
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
            </div>
          </details>
        </DocSection>

        <DocSection id="setup" title="Add it to your agent" text="Pick your agent:">
          <ul className="flex flex-wrap gap-1.5">
            {CLIENTS.map(({ id, name }) => (
              <li key={id}>
                <a href={`#${id}`} className={CHIP}>
                  {name}
                </a>
              </li>
            ))}
            <li>
              <a href="#more-clients" className={CHIP}>
                More clients
              </a>
            </li>
            <li>
              <a href="#other" className={CHIP}>
                Other clients
              </a>
            </li>
          </ul>
          <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4" data-install-links>
            <p className="text-sm">
              In one click for {INSTALL_LINK_NAMES}: each opens the client, which asks you to confirm before it adds
              GitRanks. Then sign in as its setup below says.
            </p>
            <ul className="flex flex-wrap gap-2">
              {MCP_INSTALL_LINKS.map((link) => (
                <li key={link.client} className="flex">
                  <InstallButton link={link} />
                </li>
              ))}
            </ul>
          </div>
          {CLIENTS.map((client) => (
            <DocClient key={client.id} client={client} plugin={plugin} />
          ))}
          <details id="more-clients" className="group scroll-mt-6" data-more-clients>
            <summary className="flex cursor-pointer items-center gap-1.5 text-base font-semibold hover:text-link max-sm:min-h-11">
              <ChevronRight
                aria-hidden="true"
                className="size-4 flex-none transition-transform group-open:rotate-90 motion-reduce:transition-none"
              />
              More clients: {MORE_CLIENT_NAMES}
            </summary>
            <div className="mt-3 flex flex-col gap-4">
              {MCP_DOC_MORE_CLIENTS.map((client) => (
                <MoreClient key={client.id} client={client} />
              ))}
            </div>
          </details>
          <OpenOnHash id="more-clients" />
          <div id="other" className="flex scroll-mt-6 flex-col gap-2">
            <h3 className="text-base font-semibold">Other clients</h3>
            <p className="text-sm text-muted-foreground">
              Any client that speaks Streamable HTTP works. Point it at <code className="font-mono">{MCP_URL}</code>{' '}
              with no header: a client that supports MCP sign-in opens GitRanks in your browser the first time, where
              you allow it. A client that can only send a header uses a token: send it as{' '}
              <code className="font-mono">Authorization: Bearer {TOKEN_PLACEHOLDER}</code>. If its header box takes the
              value as typed, <code className="font-mono">Authorization: {TOKEN_PLACEHOLDER}</code> works too, and so
              does <code className="font-mono">X-GitRanks-Token: {TOKEN_PLACEHOLDER}</code> where{' '}
              <code className="font-mono">Authorization</code> is taken by something else.
            </p>
            <p className="text-sm text-muted-foreground">
              A client that runs local servers only can reach GitRanks through the mcp-remote bridge: make this its
              command. Your browser opens GitRanks the first time, where you allow it.
            </p>
            <CodeBlock label="Command" copyLabel="Copy the mcp-remote command">
              {MCP_REMOTE_BRIDGE}
            </CodeBlock>
          </div>
        </DocSection>

        <DocSection id="check" title="Check it works">
          <p>Start a new session and ask your agent:</p>
          <CodeBlock label="Prompt for your agent" copyLabel="Copy the prompt" wrap>
            {AGENT_FIRST_PROMPT}
          </CodeBlock>
          <p>
            It calls <code className="font-mono text-sm">find_issues</code> and lists issues picked for you. When it
            hands a change back, it appears on GitRanks for your review, with a link in its answer.
          </p>
          <h3 className="text-base font-semibold">What happens next</h3>
          <ol className="flex list-decimal flex-col gap-2 pl-5" data-next-steps>
            {MCP_DOC_NEXT_STEPS.map((step) => (
              <li key={step}>
                <SiteText text={step} />
              </li>
            ))}
          </ol>
        </DocSection>

        <DocSection
          id="troubleshooting"
          title="Troubleshooting"
          text="Your agent hasn't connected, or doesn't list the gitranks tools? Check it in your client:"
        >
          <Troubles troubles={MCP_DOC_CHECKS} />
          <Troubles troubles={MCP_DOC_TROUBLES} />
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

        <DocSection id="brief" title="What claim_issue answers">
          <ExampleBrief />
        </DocSection>

        <DocSection id="auth" title="Sign-in and tokens">
          <h3 className="text-base font-semibold">An agent that signs in</h3>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              You allow it on GitRanks, signed in with GitHub. It can see the issues picked for you and take one, hand
              back changes for your review, and see the issues you took and your pull requests.
            </li>
            <li>
              It can&apos;t open a pull request, push or post on GitHub (you approve each pull request on GitRanks), or
              see your Claude key, settings or GitHub access.
            </li>
            <li>
              Its access lasts an hour, and the agent renews it by itself. Unused for 30 days, it has to sign in again.
            </li>
            <li>
              We keep the name its client gives itself, the address it returns to after signing in, hashes of its
              tokens, and when it connected and was last used. Nothing for you to copy or keep secret.
            </li>
            <li>It is listed on Contribute&apos;s Agent tab. Disconnect there stops it at once.</li>
          </ul>
          <h3 className="text-base font-semibold">A personal token</h3>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              For a client that can&apos;t sign in, or a script. It starts with{' '}
              <code className="font-mono text-sm">gr_</code>. Make one per computer or agent, up to {MCP_TOKENS_MAX} at
              once; each has a name you can see on the Agent tab.
            </li>
            <li>
              It lets an agent find, take and hand back work for you. It can&apos;t open a pull request, read your
              GitHub account or spend money.
            </li>
            <li>
              We keep a hash of it, its last 4 characters, its name and when it was last used, never the token. Our
              proxy and the server keep it out of our logs.
            </li>
            <li>Revoke it any time on Contribute&apos;s Agent tab. A revoked token stops working at once.</li>
          </ul>
        </DocSection>

        <DocSection
          id="limits"
          title="Limits"
          text="Per account, across all your agents and tokens. A call past a limit gets an error that says how long to wait."
        >
          <dl className="grid grid-cols-1 rounded-xl border text-sm sm:grid-cols-[200px_1fr]">
            {MCP_DOC_LIMITS.map(({ what, limit }, index) => (
              <div key={what} className="contents">
                <dt className={cn('px-4 pt-3 text-muted-foreground sm:py-3', index > 0 && 'border-t')}>{what}</dt>
                <dd className={cn('px-4 pb-3 sm:py-3', index > 0 && 'sm:border-t')}>{limit}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">{MCP_DOC_LIMITS_NOTE}</p>
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

        <DocSection id="help" title="Help">
          <p>
            Stuck? Write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              {CONTACT_EMAIL}
            </a>
            , report a setup problem in the{' '}
            <a href={MCP_PLUGIN_ISSUES_URL} className={LINK}>
              plugin&apos;s issues
            </a>{' '}
            on GitHub, or read the{' '}
            <Link href={FAQ_PATH} prefetch={false} className={LINK}>
              questions
            </Link>
            .
          </p>
        </DocSection>
      </DocLayout>

      <MorePages current="mcp" />
    </main>
  );
}
