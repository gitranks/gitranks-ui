'use client';

import { Share } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CopyButton } from '@/components/workspace/copy-button';
import {
  buildShareUrlOf,
  GITHUB_NEW_REPOSITORY,
  type GithubWords,
  githubWordsOf,
  SHARE_COPIED_LINE,
  SHARE_LINE,
} from '@/lib/build/project-share';
import { buildProjectCardPath } from '@/lib/build/share-card';

/*
 * A built project's two buttons under its box: Share, a small popover with the link to the person's build, Copy link
 * and how the posted link looks; and Put it on GitHub, a dialog with the sentence for their agent or the three commands.
 * Each panel is its own part, so the design catalogue draws it open on its board.
 */

type ShareProject = { slug: string; name: string; thing: string };

/** How the posted link looks: the picture of the person's build, at a little under a third of its size. */
function SharePreview({ project, login }: { project: ShareProject; login: string }) {
  return (
    // The picture is the PNG the site draws for the post, shown as it is: no image optimizer in between.
    <img
      src={`${buildProjectCardPath(project.slug)}?by=${encodeURIComponent(login)}`}
      alt=""
      width={360}
      height={189}
      loading="lazy"
      className="block h-auto w-full"
    />
  );
}

/** Share's panel: the link, Copy link, the line that says who sees it, and how the posted link looks. */
export function SharePanel({
  url,
  preview = null,
  copied = false,
  onCopy,
  titleId,
}: {
  url: string;
  /** The title's id, which names the popover it opens in. */
  titleId?: string;
  /** The posted picture; none when it is not shown. */
  preview?: ReactNode;
  /** The link was copied: the line says so. */
  copied?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div data-build-share className="flex flex-col gap-3">
      <p id={titleId} className="m-0 text-sm font-semibold">
        Share what you built
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="The link to your build"
          onFocus={(event) => event.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 font-mono text-xs text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <CopyButton text={url} label="Copy link" variant="default" onCopy={onCopy} className="h-9 sm:min-h-9" />
      </div>
      <p data-build-share-line className="m-0 text-xs text-muted-foreground">
        {copied ? SHARE_COPIED_LINE : SHARE_LINE}
      </p>
      {preview && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">How the link looks when you post it</span>
          <div className="aspect-[1200/630] w-full overflow-hidden rounded-lg border">{preview}</div>
        </div>
      )}
    </div>
  );
}

/**
 * "Put it on GitHub"'s panel: ask your agent, or do it yourself, and the line for a folder with no git. Inside the
 * dialog (`dialog`) its title and line are the dialog's own, for screen readers; on a board they are plain text.
 */
export function GithubPanel({
  words,
  close = null,
  dialog = false,
}: {
  words: GithubWords;
  close?: ReactNode;
  dialog?: boolean;
}) {
  const Title = dialog ? DialogTitle : 'h2';
  const Line = dialog ? DialogDescription : 'p';
  return (
    <div data-build-github className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 pr-6">
        <Title className="m-0 text-lg font-semibold">{words.title}</Title>
        <Line className="m-0 text-sm text-muted-foreground">
          Your code is in a folder on your computer. If you used git, each step is already one commit, so your history
          shows how you built it.
        </Line>
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="m-0 text-sm font-semibold">Ask your agent</h3>
        <p className="m-0 text-sm text-muted-foreground">
          In the folder of your build, say this to your agent. It needs the GitHub CLI, signed in.
        </p>
        <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
          <span className="min-w-0 flex-1 text-sm">{words.say}</span>
          <CopyButton text={words.say} label="Copy" className="h-8 sm:min-h-8" />
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="m-0 text-sm font-semibold">Or do it yourself</h3>
        <ol className="m-0 flex flex-col gap-2 pl-5 text-sm">
          <li>
            Make an empty repository on GitHub:{' '}
            <a
              href={GITHUB_NEW_REPOSITORY}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-link underline-offset-4 hover:underline"
            >
              github.com/new
            </a>
            . Name it <span className="font-mono">{words.repository}</span> and add no files to it.
          </li>
          <li>
            In the folder of your build, run:
            <pre className="mt-2 mb-0 overflow-x-auto rounded-md border bg-muted px-3 py-2 font-mono text-xs">
              {words.commands.join('\n')}
            </pre>
          </li>
        </ol>
        <p className="m-0 text-xs text-muted-foreground">
          No git in that folder? Run <code className="font-mono">git init</code>,{' '}
          <code className="font-mono">git add .</code> and <code className="font-mono">{words.commit}</code> first.
        </p>
      </section>
      {close && <div className="flex justify-end">{close}</div>}
    </div>
  );
}

/** The two buttons, each opening its panel. Share waits for Build to be open to everyone (`share`). */
export function ProjectShareActions({
  project,
  login,
  share = true,
}: {
  project: ShareProject;
  login: string;
  share?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const url = buildShareUrlOf(project.slug, login);
  return (
    <div data-project-share-actions className="flex flex-wrap items-center gap-3">
      {share && (
        <Popover onOpenChange={(open) => open || setCopied(false)}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="font-semibold max-sm:min-h-11">
              <Share aria-hidden="true" />
              Share
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-labelledby={titleId}
            align="start"
            sideOffset={8}
            className="w-[min(392px,calc(100vw-2rem))] rounded-xl shadow-lg"
          >
            <SharePanel
              url={url}
              titleId={titleId}
              copied={copied}
              onCopy={() => setCopied(true)}
              preview={<SharePreview project={project} login={login} />}
            />
          </PopoverContent>
        </Popover>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="font-semibold max-sm:min-h-11">
            Put it on GitHub
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl sm:max-w-[560px]">
          <GithubDialogBody words={githubWordsOf(project, login)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** The panel inside the dialog, with its Close. */
function GithubDialogBody({ words }: { words: GithubWords }) {
  return (
    <GithubPanel
      words={words}
      dialog
      close={
        <DialogClose asChild>
          <Button variant="outline" className="font-semibold">
            Close
          </Button>
        </DialogClose>
      }
    />
  );
}
