import { FC, ReactNode } from 'react';

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ProfileCardProps = {
  title?: string | null;
  children: ReactNode;
  href?: string | null;
  className?: string;
};

export const ProfileCard: FC<ProfileCardProps> = ({ children, className }) => {
  return (
    <Card
      className={cn(
        'border-0 md:border-2 border-border p-0 md:p-4 min-w-xs flex-grow basis-0 shadow-none md:shadow-sm gap-4',
        className,
      )}
    >
      {children}
    </Card>
  );
};

type ProfileCardHeaderProps = {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export const ProfileCardHeader: FC<ProfileCardHeaderProps> = ({ children, meta, className }) => {
  return (
    <CardHeader className={cn('p-0 flex flex-row items-center gap-2', className)}>
      <CardTitle className="text-lg">{children}</CardTitle>
      {!!meta ? meta : null}
    </CardHeader>
  );
};

type ProfileCardContentProps = {
  children: ReactNode;
  className?: string;
};

export const ProfileCardContent: FC<ProfileCardContentProps> = ({ children, className }) => {
  return <CardContent className={cn('p-0 flex flex-col gap-1.5', className)}>{children}</CardContent>;
};

type ProfileCardActionsProps = {
  children: ReactNode;
  className?: string;
};

export const ProfileCardActions: FC<ProfileCardActionsProps> = ({ children, className }) => {
  return <CardAction className={cn(className)}>{children}</CardAction>;
};
