import { describe, expect, it, vi } from 'vitest';

import { interviewsHome } from './__fixtures__/companies';
import { interviewsAiCatalogEntriesOf } from './ai-catalog';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

describe("Interviews' entries in the AI Catalog", () => {
  it("lists the home's copy, then each company's and each of its plans' copies, in the home's order", () => {
    const entries = interviewsAiCatalogEntriesOf(interviewsHome);
    expect(entries.slice(0, 3)).toEqual([
      {
        identifier: 'urn:air:gitranks.com:interviews',
        type: 'text/markdown',
        url: 'https://example.test/interviews.md',
      },
      {
        identifier: 'urn:air:gitranks.com:interviews:northwind',
        type: 'text/markdown',
        url: 'https://example.test/interviews/northwind.md',
      },
      {
        identifier: 'urn:air:gitranks.com:interviews:northwind:entry-software-engineer',
        type: 'text/markdown',
        url: 'https://example.test/interviews/northwind/entry-software-engineer.md',
      },
    ]);
    expect(entries.at(-1)).toEqual({
      identifier: 'urn:air:gitranks.com:interviews:tallgrass:site-reliability-engineer',
      type: 'text/markdown',
      url: 'https://example.test/interviews/tallgrass/site-reliability-engineer.md',
    });
    expect(new Set(entries.map((entry) => entry.identifier)).size).toBe(entries.length);
  });

  it('lists the home alone when no company could be read, and never a company with no plan', () => {
    expect(interviewsAiCatalogEntriesOf({ companies: [] })).toHaveLength(1);
    const [northwind] = interviewsHome.companies;
    expect(interviewsAiCatalogEntriesOf({ companies: [{ ...northwind, plans: [] }] })).toHaveLength(1);
  });
});
