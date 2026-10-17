import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import { getDefaultLabel } from './get-default-label';
import type { BadgeV2ZodSchema } from '@/badge/badge.zod';

export type BadgeFormValues = Partial<z.infer<typeof BadgeV2ZodSchema>>;

/**
 * Saves every change. A new ranking or type gets its own label, unless that label stays the same
 * (e.g. Rank to Tier): a typed label is then kept.
 */
export const watchBadgeForm = (
  form: Pick<UseFormReturn<BadgeFormValues>, 'watch' | 'setValue' | 'getValues'>,
  save: (values: BadgeFormValues) => void,
) => {
  let defaultLabel = getDefaultLabel(form.getValues('ranking'), form.getValues('type'));

  return form.watch((value, { name }) => {
    if (name === 'ranking' || name === 'type') {
      const nextDefaultLabel = getDefaultLabel(value.ranking, value.type);
      if (nextDefaultLabel !== defaultLabel) {
        defaultLabel = nextDefaultLabel;
        form.setValue('label', nextDefaultLabel);
      }
    }
    save(form.getValues());
  });
};
