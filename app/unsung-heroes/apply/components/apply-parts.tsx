import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { Pill } from '@/components/pill/pill';
import { CONTACT_EMAIL } from '@/lib/legal';
import type { ApplyPackage, ApplyRegistry } from '@/lib/unsung-hero/apply.types';
import { packageNameOf, usageShort } from '@/lib/unsung-hero/apply-copy';
import { registryLabelOf } from '@/lib/unsung-hero/apply-prompt';
import { cn } from '@/lib/utils';

/** One block of the apply page's right column. */
export function ApplyCard({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm dark:shadow-none',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Where to write, in every state. */
export function ApplyContact() {
  return (
    <p className="text-sm text-muted-foreground">
      Questions or ideas? Write to{' '}
      <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
        {CONTACT_EMAIL}
      </a>
      .
    </p>
  );
}

/** A package's registry, as a small pill. */
export function RegistryPill({ registries, id }: Readonly<{ registries: readonly ApplyRegistry[]; id: string }>) {
  return <Pill size="small">{registryLabelOf(registries, id)}</Pill>;
}

/** A package in one line: its name and registry, its repository and how much it is used. */
export function PackageLine({
  pkg,
  registries,
  found = false,
}: Readonly<{ pkg: ApplyPackage; registries: readonly ApplyRegistry[]; found?: boolean }>) {
  const usage = usageShort(pkg);
  const meta = [pkg.repository, usage].filter(Boolean).join(' · ');
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="flex min-w-0 items-center gap-2">
        {found && <Check aria-label="Found" className="size-4 shrink-0 text-positive" />}
        <span className="truncate font-medium">{packageNameOf(pkg)}</span>
        <RegistryPill registries={registries} id={pkg.registry} />
      </span>
      {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
    </span>
  );
}
