import type { FC, ReactNode } from 'react';

import { Page } from '@/components/page/page';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

type BackboneProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export const PageContainer: FC<BackboneProps> = ({ children, className }) => {
  // Two columns from md, the first as wide as the left column. One column on phones, no wider than the
  // screen: a wide table inside scrolls in its own box instead of widening the page.
  return (
    <Page
      className={cn(
        'grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]',
        className,
      )}
    >
      {children}
    </Page>
  );
};

export const LeftColumnContainer: FC<BackboneProps> = ({ children, className }) => {
  return <div className={cn('flex min-w-0 flex-col gap-4', className)}>{children}</div>;
};

export const AvatarAndNameContainer: FC<BackboneProps> = ({ children, className }) => {
  return <div className={cn('flex flex-row md:flex-col items-center md:items-start gap-4', className)}>{children}</div>;
};

export const AvatarContainer: FC<BackboneProps> = ({ children, className }) => {
  return (
    <div className={cn('w-[64] sm:w-[128] md:w-full', className)}>
      <AspectRatio ratio={1}>{children}</AspectRatio>
    </div>
  );
};

export const NameContainer: FC<BackboneProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

export const ActionsContainer: FC<BackboneProps> = ({ children, className }) => {
  return <div className={cn('flex flex-row md:flex-col gap-4', className)}>{children}</div>;
};

export const DetailsContainer: FC<BackboneProps> = ({ children, className }) => {
  return <div className={cn('flex flex-col gap-6', className)}>{children}</div>;
};
