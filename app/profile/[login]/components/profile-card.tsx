import { ArrowRight } from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { Link } from '@/components/link/link';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ProfileCardsGridProps = {
  children: ReactNode;
  className?: string;
};

export const ProfileCardsGrid: FC<ProfileCardsGridProps> = ({ children, className }) => {
  return (
    <div className={cn('grid gap-4 md:gap-6 grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]', className)}>
      {children}
    </div>
  );
};

type ProfileCardProps = {
  children: ReactNode;
  className?: string;
};

// A hairline and a light shadow in light mode, the hairline alone in dark.
export const ProfileCard: FC<ProfileCardProps> = ({ children, className }) => {
  return <Card className={cn('w-full gap-4 p-4 dark:shadow-none', className)}>{children}</Card>;
};

type ProfileCardHeaderProps = {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export const ProfileCardHeader: FC<ProfileCardHeaderProps> = ({ children, meta, className }) => {
  return (
    <CardHeader className={cn('p-0 flex flex-row items-center gap-2', className)}>
      <CardTitle className="text-base font-semibold">{children}</CardTitle>
      {meta ?? null}
    </CardHeader>
  );
};

type ProfileCardContentProps = {
  children: ReactNode;
  className?: string;
};

export const ProfileCardContent: FC<ProfileCardContentProps> = ({ children, className }) => {
  return <CardContent className={cn('p-0 flex grow flex-col gap-1.5', className)}>{children}</CardContent>;
};

type ProfileCardActionsProps = {
  children: ReactNode;
  className?: string;
};

export const ProfileCardActions: FC<ProfileCardActionsProps> = ({ children, className }) => {
  return <CardAction className={cn(className)}>{children}</CardAction>;
};

/** A link to the full view of what a card or section shows: "All languages →". */
export const MoreLink: FC<{ href: string; children: ReactNode; className?: string; rel?: string }> = ({
  href,
  children,
  className,
  rel,
}) => (
  <Link
    href={href}
    rel={rel}
    className={cn('inline-flex items-center gap-1 text-sm font-medium no-underline hover:underline', className)}
  >
    {children}
    <ArrowRight className="size-4" aria-hidden />
  </Link>
);

/** A labelled block of the profile's main column: title, optional intro, optional link on the right. */
export const ProfileSection: FC<{
  id: string;
  title: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ id, title, intro, action, children, className }) => (
  <section aria-labelledby={id} className={cn('flex flex-col gap-4', className)}>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-xl font-semibold tracking-tight text-balance">
          {title}
        </h3>
        {intro && <p className="text-sm text-muted-foreground">{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </section>
);

/** The small uppercase label over a value or a group: "GLOBAL RANK", "CONTACTS". */
export const Eyebrow: FC<{ children: ReactNode; className?: string; as?: 'span' | 'h2' | 'h3' | 'h4' }> = ({
  children,
  className,
  as: Tag = 'span',
}) => (
  <Tag className={cn('text-xs font-semibold tracking-wider text-muted-foreground uppercase', className)}>
    {children}
  </Tag>
);
