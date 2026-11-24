import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContributeError, LearnError, SharedPageError } from './try-again';

const textOf = (Page: typeof ContributeError) =>
  renderToStaticMarkup(<Page error={new Error('down')} reset={() => {}} />)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('the "try again" pages', () => {
  it('say which product did not load, or name none on a page both products open, with the same two ways on', () => {
    expect(textOf(ContributeError)).toBe(
      'Contribute did not load Your data is safe; we could not read it just now. Try again in a minute. Try again Back to GitRanks',
    );
    expect(textOf(LearnError)).toBe(
      'This page did not load Your progress is safe; we could not read it just now. Try again in a minute. Try again Back to GitRanks',
    );
    expect(textOf(SharedPageError)).toBe(
      'This page did not load Your work is safe; we could not read it just now. Try again in a minute. Try again Back to GitRanks',
    );
  });

  it('are the ones every error file uses', async () => {
    const contribute = [
      await import('@/app/(workspace)/contribute/error'),
      await import('@/app/(workspace)/my/error'),
      await import('@/app/(public)/contribute/error'),
      await import('@/app/(onboarding)/contribute/start/error'),
    ];
    const learn = [
      await import('@/app/(workspace)/learn/error'),
      await import('@/app/(learn)/error'),
      await import('@/app/(player)/learn/error'),
      await import('@/app/(public)/learn/error'),
      await import('@/app/(onboarding)/learn/start/error'),
    ];
    for (const page of contribute) expect(page.default).toBe(ContributeError);
    for (const page of learn) expect(page.default).toBe(LearnError);
    expect((await import('@/app/(player)/my/error')).default).toBe(SharedPageError);
  });
});
