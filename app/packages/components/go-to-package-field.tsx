'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { packageNameOfInput } from './go-to-package';
import { useReportPendingNavigation } from '@/components/navigation-progress/navigation-progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { packagePath } from '@/utils/package-paths';

/**
 * "Go to a package": takes an npm package's name and opens its page. A name npm would never take is refused here, with
 * a line saying so, before anything opens.
 */
export function GoToPackageField({ registry = 'npm' }: Readonly<{ registry?: string }>) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [isPending, startTransition] = useTransition();
  useReportPendingNavigation(isPending);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = packageNameOfInput(value);
    setInvalid(!name);
    if (name) {
      startTransition(() => router.push(packagePath(name, registry)));
    }
  };

  return (
    <form aria-label="Go to a package" className="flex flex-col gap-1 text-sm" onSubmit={onSubmit}>
      <label htmlFor={inputId} className="font-medium">
        Go to a package
      </label>
      <div className="flex w-full max-w-sm gap-2">
        <Input
          id={inputId}
          name="package"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (invalid) setInvalid(false);
          }}
          placeholder="react or @scope/name"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          Go
        </Button>
      </div>
      {invalid && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          That is not an npm package name. Try one like react or @scope/name.
        </p>
      )}
    </form>
  );
}
