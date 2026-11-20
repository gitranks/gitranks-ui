import { describe, expect, it } from 'vitest';

import { withWorkPicks, workPicksOf, workPicksQuery } from './start-flow';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

describe('What you work on, in the address', () => {
  it('reads the known names in either case, in the table’s order, each once', () => {
    expect(workPicksOf({ languages: 'rust,js_ts,GO,rust', kinds: 'tests,bug' })).toEqual({
      languages: ['JS_TS', 'GO', 'RUST'],
      kinds: ['BUG', 'TESTS'],
    });
    expect(workPicksOf(new URLSearchParams('languages=python&kinds=docs'))).toEqual({
      languages: ['PYTHON'],
      kinds: ['DOCS'],
    });
  });

  it('drops what it does not know, and reads a missing or repeated parameter safely', () => {
    expect(workPicksOf({ languages: 'cobol,,<script>', kinds: 'L' })).toEqual({ languages: [], kinds: [] });
    expect(workPicksOf({})).toEqual({ languages: [], kinds: [] });
    expect(workPicksOf({ languages: ['go', 'rust'] })).toEqual({ languages: ['GO'], kinds: [] });
  });

  it('writes the picks in lower case, empty lists left out, and round-trips', () => {
    const picks = { languages: ['RUST', 'JS_TS'] as const, kinds: ['BUG'] as const };
    expect(workPicksQuery({ languages: [...picks.languages], kinds: [...picks.kinds] })).toBe(
      'languages=rust,js_ts&kinds=bug',
    );
    expect(workPicksQuery({ languages: [], kinds: [] })).toBe('');
    const href = withWorkPicks(GETTING_IN_PATHS.contributeAgent, { languages: ['GO', 'PHP'], kinds: ['TESTS'] });
    expect(href).toBe('/contribute/start/agent?languages=go,php&kinds=tests');
    expect(workPicksOf(new URL(href, 'https://gitranks.com').searchParams)).toEqual({
      languages: ['GO', 'PHP'],
      kinds: ['TESTS'],
    });
    expect(withWorkPicks(GETTING_IN_PATHS.contributeAgent, { languages: [], kinds: [] })).toBe(
      '/contribute/start/agent',
    );
  });
});
