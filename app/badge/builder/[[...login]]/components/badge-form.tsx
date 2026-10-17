'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryStates } from 'nuqs';
import { type FC, type PropsWithChildren, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDebounceCallback } from 'usehooks-ts';

import { getDefaultLabel } from '../utils/get-default-label';
import { type BadgeFormValues, watchBadgeForm } from '../utils/watch-badge-form';
import { ColorPickerField } from './color-picker-field';
import type { BadgeBuilderProfileProps } from './login-form.types';
import { StepTitle } from './step-title';
import { RANK_NAME } from '@/badge/badge.consts';
import { BadgeNuqsSchema } from '@/badge/badge.nuqs';
import { BadgeV2ZodSchema } from '@/badge/badge.zod';
import { LABEL_BG, VALUE_BG } from '@/badge/templates/inline/inline.consts';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgeContext, BadgeCornerStyle, BadgeMeta, BadgeType } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

const BadgeFormRow: FC<PropsWithChildren> = ({ children }) => {
  return <div className="flex flex-wrap justify-between gap-4 lg:gap-8">{children}</div>;
};

const BadgeFormItem: FC<PropsWithChildren> = ({ children }) => {
  return <FormItem className="flex-grow min-w-[224px]">{children}</FormItem>;
};

const RANKINGS = [UserRankProp.s, UserRankProp.c, UserRankProp.f];

type BadgeFormProps = Pick<BadgeBuilderProfileProps, 'rankedIn' | 'country'>;

export function BadgeForm({ rankedIn, country }: BadgeFormProps) {
  const [params, saveValues] = useQueryStates(BadgeNuqsSchema);
  const debouncedSaveValues = useDebounceCallback(saveValues, 500);

  const form = useForm<BadgeFormValues>({
    resolver: zodResolver(BadgeV2ZodSchema),
    defaultValues: { ...params, label: params.label ?? getDefaultLabel(params.ranking, params.type) },
  });

  const context = form.watch('context') ?? BadgeContext.Global;
  const noCountryRanks = !!rankedIn && !rankedIn[BadgeContext.Country].length;

  useEffect(() => {
    const subscription = watchBadgeForm(form, debouncedSaveValues);
    return () => subscription.unsubscribe();
  }, [form, debouncedSaveValues]);

  return (
    <div className="flex flex-col gap-6">
      <StepTitle>Step 2. Customize Badge Appearance</StepTitle>

      <Form {...form}>
        <BadgeFormRow>
          <FormField
            control={form.control}
            name="ranking"
            render={({ field }) => (
              <BadgeFormItem>
                <FormLabel>Ranking</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Ranking" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RANKINGS.map((option) => {
                      const notRanked = !!rankedIn && !rankedIn[context].includes(option);
                      return (
                        <SelectItem key={option} value={option} disabled={notRanked}>
                          {`${RANK_NAME[option]}ing${notRanked ? ' (not ranked)' : ''}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </BadgeFormItem>
            )}
          />

          <FormField
            control={form.control}
            name="context"
            render={({ field }) => (
              <BadgeFormItem>
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
                        <RadioGroupItem value={BadgeContext.Country} disabled={noCountryRanks} />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {`Country${noCountryRanks ? (country ? ' (not ranked)' : ' (not detected)') : ''}`}
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
              </BadgeFormItem>
            )}
          />
        </BadgeFormRow>

        <BadgeFormRow>
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <BadgeFormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
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
              </BadgeFormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meta"
            render={({ field }) => (
              <BadgeFormItem>
                <FormLabel>Metadata</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select metadata" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={BadgeMeta.None}>None</SelectItem>
                    <SelectItem value={BadgeMeta.MonthlyChange}>Monthly Change</SelectItem>
                    <SelectItem value={BadgeMeta.Percentile}>Percentile Rank</SelectItem>
                    <SelectItem value={BadgeMeta.GoalNextTier}>Progress To The Next Tier</SelectItem>
                    <SelectItem value={BadgeMeta.GoalTop1}>Progress To Top 1%</SelectItem>
                    <SelectItem value={BadgeMeta.GoalTop10}>Progress To Top 10%</SelectItem>
                    <SelectItem value={BadgeMeta.GoalTop25}>Progress To Top 25%</SelectItem>
                  </SelectContent>
                </Select>
              </BadgeFormItem>
            )}
          />
        </BadgeFormRow>

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

        <BadgeFormRow>
          <ColorPickerField
            name="labelBgColor"
            label="Label Background Color"
            placeholder="#hex"
            defaultValue={LABEL_BG}
          />

          <ColorPickerField
            name="valueBgColor"
            label="Value Background Color"
            placeholder="#hex"
            defaultValue={VALUE_BG}
          />
        </BadgeFormRow>

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
      </Form>
    </div>
  );
}
