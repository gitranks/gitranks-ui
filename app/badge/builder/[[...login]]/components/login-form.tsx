'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Search } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FC } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { LoginFormProps } from './login-form.types';
import { StepTitle } from './step-title';

const FormSchema = z.object({
  login: z.string().min(1, { message: 'GitHub login is required' }),
});

export const LoginForm: FC<LoginFormProps> = ({ githubLogin = '', githubId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { login: githubLogin },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const qs = searchParams.toString();

    if (githubId) {
      router.push(`/badge/builder?${qs}` as Route);
    } else {
      router.push(`/badge/builder/${data.login}?${qs}` as Route);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <StepTitle>Step 1. Choose a GitHub Profile</StepTitle>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="login"
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-4">
                  <Input {...field} placeholder="GitHub login" className="flex-grow min-w-3xs" disabled={!!githubId} />
                  <Button type="submit">
                    {githubId ? <Edit className="size-4" /> : <Search className="size-4" />}
                    {githubId ? 'Edit' : 'Search'}
                  </Button>
                </div>
                <FormMessage className="text-negative">
                  {githubLogin && !githubId && (
                    <>
                      We couldn&apos;t find this GitHub login in our database - check the spelling, and if it&apos;s
                      correct, visit the{' '}
                      <Link href={`/profile/${githubLogin}`} className="underline">
                        GitRanks profile page
                      </Link>{' '}
                      to fetch it from GitHub manually.
                    </>
                  )}
                </FormMessage>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
};
