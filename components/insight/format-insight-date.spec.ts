import { describe, expect, it } from 'vitest';

import { formatPostDate, formatPostDateTime, formatPostDay } from './format-insight-date';

describe('post date formatters', () => {
  it('format in UTC whatever the local zone', () => {
    const date = new Date('2026-10-16T23:30:00.000Z');

    expect(formatPostDay(date)).toBe('Oct 16');
    expect(formatPostDate(date)).toBe('Oct 16, 2026');
    expect(formatPostDateTime(date)).toBe('Oct 16, 11:30 PM UTC');
    expect(formatPostDateTime(date)).not.toMatch(/[\u00a0\u202f]/);
  });
});
