import { ArrowLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { HEADING, PageTitle } from './primitives';
import { SETTINGS_PATHS } from '@/lib/contribute/settings-paths';
import { cn } from '@/lib/utils';

/** A group of the Settings summary: its title, and its rows in one bordered list. */
export function SettingsGroup({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  /** Beside the title: a help link. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-20 flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={`${id}-title`} className={HEADING.block}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The bordered list a group's rows sit in. */
export function SettingsList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('divide-y overflow-hidden rounded-xl border bg-card', className)}>{children}</ul>;
}

function RowBody({ icon: Icon, title, value }: { icon: LucideIcon; title: ReactNode; value: ReactNode }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">{title}</span>
        <span className="text-sm break-words text-muted-foreground">{value}</span>
      </span>
    </>
  );
}

/**
 * One setting on the summary: what it is and its value in plain words. With `href` the whole row opens the page it is
 * changed on; without one, `children` are its controls.
 */
export function SettingsRow({
  id,
  icon,
  title,
  value,
  href,
  children,
  data,
}: {
  id?: string;
  icon: LucideIcon;
  title: ReactNode;
  value: ReactNode;
  href?: Route;
  children?: ReactNode;
  /** `data-*` attributes for the row. */
  data?: Record<`data-${string}`, string>;
}) {
  if (href) {
    return (
      <li id={id} className="scroll-mt-20" {...data}>
        <Link
          href={href}
          prefetch={false}
          className="flex items-center gap-3 px-4 py-3.5 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <RowBody icon={icon} title={title} value={value} />
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </li>
    );
  }
  return (
    <li id={id} className="flex scroll-mt-20 flex-wrap items-center gap-3 px-4 py-3.5" {...data}>
      <span className="flex min-w-0 flex-[1_1_240px] items-center gap-3">
        <RowBody icon={icon} title={title} value={value} />
      </span>
      {children ? <span className="ml-auto flex flex-wrap items-center gap-2">{children}</span> : null}
    </li>
  );
}

/** A Settings page's head: back to the summary, its title and what it is for. */
export function SettingsPageHead({ title, text }: { title: string; text?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={SETTINGS_PATHS.summary}
        prefetch={false}
        className="inline-flex items-center gap-1.5 self-start rounded text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Settings
      </Link>
      <PageTitle title={title} text={text} />
    </div>
  );
}
