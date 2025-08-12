'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
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
    errors: {
      login: {
        type: 'custom',
        message:
          githubLogin && !githubId ? 'Oops! We looked everywhere but found no trace of that GitHuber' : undefined,
      },
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    router.push(`/badge/${data.login}?${searchParams.toString()}`);
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
                  <Input {...field} placeholder="GitHub login" className="flex-grow min-w-3xs" />

                  <Button type="submit">
                    <Search className="size-4" />
                    Search
                  </Button>
                </div>
                <FormMessage className="text-negative" />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
};
