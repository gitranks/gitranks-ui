import { cn } from '@/lib/utils';

export const Page = ({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) => {
  return <main className={cn('flex flex-col p-4 max-w-7xl mx-auto', className)}>{children}</main>;
};
