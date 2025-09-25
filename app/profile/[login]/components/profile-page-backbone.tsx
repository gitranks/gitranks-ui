import type { FC, ReactNode } from 'react';

import { Page } from '@/components/page/page';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

type BackboneProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export const PageContainer: FC<BackboneProps> = ({ children, className }) => {
  return <Page className={cn('gap-6 flex-col md:flex-row', className)}>{children}</Page>;
};

export const LeftColumnContainer: FC<BackboneProps> = ({ children, className }) => {
  return <div className={cn('w-full md:w-3xs xl:w-2xs flex flex-col shrink-0 gap-4', className)}>{children}</div>;
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
