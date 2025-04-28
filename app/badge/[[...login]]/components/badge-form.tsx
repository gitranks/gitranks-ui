'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryStates } from 'nuqs';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BadgeNuqsSchema } from '@/badge/badge.nuqs';
import { BadgeTemplateType } from '@/badge/badge.types';
import { BadgeZodSchema } from '@/badge/badge.zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

import { StepTitle } from './step-title';

export function BadgeForm() {
  const [defaultValues, saveValues] = useQueryStates(BadgeNuqsSchema);

  const form = useForm<Partial<z.infer<typeof BadgeZodSchema>>>({
    resolver: zodResolver(BadgeZodSchema),
    defaultValues,
  });

  useEffect(() => {
    const subscription = form.watch((value) => saveValues(value));
    return () => subscription.unsubscribe();
  }, [form, saveValues]);

  return (
    <div className="flex flex-col gap-4">
      <StepTitle>Step 2. Customize Badge Appearance</StepTitle>

      <Form {...form}>
        <FormField
          control={form.control}
          name="rankingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ranking Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="min-w-3xs">
                    <SelectValue placeholder="Select a ranking type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={RankingType.Star}>Stars</SelectItem>
                  <SelectItem value={RankingType.Contribution}>Contributions</SelectItem>
                  <SelectItem value={RankingType.Follower}>Followers</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="template"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="min-w-3xs">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BadgeTemplateType.Medium}>Medium</SelectItem>
                  <SelectItem value={BadgeTemplateType.Small}>Small</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Theme</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-6">
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem value={ThemeType.Light} />
                    </FormControl>
                    <FormLabel className="font-normal">Light</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem value={ThemeType.Dark} />
                    </FormControl>
                    <FormLabel className="font-normal">Dark</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
      </Form>
    </div>
  );
}
