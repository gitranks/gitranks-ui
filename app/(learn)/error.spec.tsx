import { describe, expect, it } from 'vitest';

describe("Learn's pages under its bar", () => {
  it('catch a failed read with the same "try again" page as Learn\'s other pages', async () => {
    const { default: boundary } = await import('./error');
    const { default: learn } = await import('@/app/(public)/learn/error');
    expect(boundary).toBe(learn);
  });
});
