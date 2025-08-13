'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryStates } from 'nuqs';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDebounceCallback } from 'usehooks-ts';
import { z } from 'zod';

import { BadgeNuqsSchema } from '@/badge/badge.nuqs';
import { BadgeV2ZodSchema } from '@/badge/badge.zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgeContext, BadgeCornerStyle, BadgeMeta, BadgeRanking, BadgeType } from '@/types/badge.types';

import { ColorPickerField } from './color-picker-field';
import { StepTitle } from './step-title';

export function BadgeForm() {
  const [defaultValues, saveValues] = useQueryStates(BadgeNuqsSchema);
  const debouncedSaveValues = useDebounceCallback(saveValues, 500);

  const form = useForm<Partial<z.infer<typeof BadgeV2ZodSchema>>>({
    resolver: zodResolver(BadgeV2ZodSchema),
    defaultValues,
  });

  useEffect(() => {
    const subscription = form.watch((value) => debouncedSaveValues(value));
    return () => subscription.unsubscribe();
  }, [form, debouncedSaveValues]);

  return (
    <div className="flex flex-col gap-4">
      <StepTitle>Step 2. Customize Badge Appearance</StepTitle>

      <Form {...form}>
        <FormField
          control={form.control}
          name="ranking"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ranking</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="min-w-3xs">
                    <SelectValue placeholder="Select Ranking" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BadgeRanking.s}>Stars Ranking</SelectItem>
                  <SelectItem value={BadgeRanking.c}>Contributor Ranking</SelectItem>
                  <SelectItem value={BadgeRanking.f}>Followers Ranking</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="context"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Context</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-6">
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem value={BadgeContext.Global} />
                    </FormControl>
                    <FormLabel className="font-normal">Global</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem value={BadgeContext.Country} />
                    </FormControl>
                    <FormLabel className="font-normal">Country</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="min-w-3xs">
                    <SelectValue placeholder="Select a badge type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BadgeType.Position}>Rank</SelectItem>
                  <SelectItem value={BadgeType.Score}>Score</SelectItem>
                  <SelectItem value={BadgeType.Percentile}>Percentile</SelectItem>
                  <SelectItem value={BadgeType.Tier}>Tier</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metadata</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="min-w-3xs">
                    <SelectValue placeholder="Select metadata" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BadgeMeta.None}>None</SelectItem>
                  <SelectItem value={BadgeMeta.MonthlyChange}>Monthly Change</SelectItem>
                  <SelectItem value={BadgeMeta.Percentile}>Percentile</SelectItem>
                  <SelectItem value={BadgeMeta.GoalNextTier}>Goal Next Tier</SelectItem>
                  <SelectItem value={BadgeMeta.GoalTop1}>Goal Top 1</SelectItem>
                  <SelectItem value={BadgeMeta.GoalTop10}>Goal Top 10</SelectItem>
                  <SelectItem value={BadgeMeta.GoalTop25}>Goal Top 25</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cornerStyle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Corner Style</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-6">
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem value={BadgeCornerStyle.Rounded} />
                    </FormControl>
                    <FormLabel className="font-normal">Rounded</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem value={BadgeCornerStyle.Squared} />
                    </FormControl>
                    <FormLabel className="font-normal">Squared</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="Label" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <ColorPickerField name="labelBgColor" label="Label Background Color" placeholder="#hex" />

        <ColorPickerField name="valueBgColor" label="Value Background Color" placeholder="#hex" />
      </Form>
    </div>
  );
}
