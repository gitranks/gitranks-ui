import { Eyebrow } from './primitives';

const STEPS = [
  {
    title: 'Create a workspace named gitranks',
    text: 'Settings › Workspaces › Create workspace.',
    link: { href: 'https://platform.claude.com/settings/workspaces', label: 'Open Workspaces' },
  },
  {
    title: 'Set its monthly spend limit',
    text: 'Select the workspace › Spend limits. Use your monthly credit amount: $100 on Max 5x, $200 on Max 20x. The limit is what keeps work from going past your credits; GitRanks cannot see your balance.',
  },
  {
    title: 'Create an API key in that workspace',
    text: 'API keys › Create key › pick the gitranks workspace. Copy it; the Console shows it once.',
    link: { href: 'https://platform.claude.com/settings/keys', label: 'Open API keys' },
  },
];

/** The Claude Console walkthrough: a separate workspace with its own spend limit, and a key in it. */
export function ConsoleSteps() {
  return (
    <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6">
      <Eyebrow>In the Claude Console</Eyebrow>
      <ol className="flex flex-col gap-4">
        {STEPS.map(({ title, text, link }, index) => (
          <li key={title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-violet-50 text-sm font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
              {index + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
              {link ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-link underline">
                  {link.label}
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900 dark:bg-amber-950/40">
        <span className="font-semibold text-amber-900 dark:text-amber-200">Check auto-reload first</span>
        <span className="text-sm text-amber-950/80 dark:text-amber-100/80">
          Your monthly credits are spent before any balance you bought. If auto-reload is on, work could continue on
          real money once the credits run out. The workspace spend limit stops that.
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Max and Team credits cover the API and Claude Managed Agents, which the agent runs on. They expire at the end of
        each billing cycle, unused.
      </p>
    </div>
  );
}
