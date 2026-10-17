import { createFormControl } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { type BadgeFormValues, watchBadgeForm } from './watch-badge-form';
import { BadgeContext, BadgeType } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

const setUp = (defaultValues: BadgeFormValues) => {
  const form = createFormControl<BadgeFormValues>({ defaultValues });
  const saved: BadgeFormValues[] = [];
  watchBadgeForm(form, (values) => saved.push(values));

  // What a form field's onChange does.
  const change = <K extends keyof BadgeFormValues>(name: K, value: BadgeFormValues[K]) =>
    form.register(name).onChange({ target: { name, value }, type: 'change' });

  return { form, saved, change };
};

const start = { ranking: UserRankProp.s, type: BadgeType.Position, context: BadgeContext.Global };

describe('watchBadgeForm', () => {
  it('leaves a label given on load alone until something changes', () => {
    const { form, saved } = setUp({ ...start, label: 'My rank' });

    expect(form.getValues('label')).toBe('My rank');
    expect(saved).toEqual([]);
  });

  it('gives a new ranking its label, and saves it', async () => {
    const { form, saved, change } = setUp({ ...start, label: 'Stars Rank' });

    await change('ranking', UserRankProp.c);

    expect(form.getValues('label')).toBe('Contributor Rank');
    expect(saved.at(-1)).toMatchObject({ ranking: UserRankProp.c, label: 'Contributor Rank' });
  });

  it('gives a new type its label when that label changes', async () => {
    const { form, saved, change } = setUp({ ...start, ranking: UserRankProp.c, label: 'Mine' });

    await change('type', BadgeType.Score);

    expect(form.getValues('label')).toBe('Contribution Score');
    expect(saved.at(-1)).toMatchObject({ type: BadgeType.Score, label: 'Contribution Score' });
  });

  it('keeps a typed label when the derived label stays the same', async () => {
    const { form, saved, change } = setUp({ ...start, label: 'Stars Rank' });

    await change('label', 'Mine');
    await change('type', BadgeType.Tier);
    await change('context', BadgeContext.Country);

    expect(form.getValues('label')).toBe('Mine');
    expect(saved.at(-1)).toMatchObject({ type: BadgeType.Tier, context: BadgeContext.Country, label: 'Mine' });
  });

  it('saves a cleared label as empty', async () => {
    const { saved, change } = setUp({ ...start, label: 'Stars Rank' });

    await change('label', '');

    expect(saved.at(-1)).toMatchObject({ label: '' });
  });
});
