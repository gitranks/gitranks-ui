import { describe, expect, it } from 'vitest';

import { llmsTxtOf } from './llms-txt';

describe('llms.txt', () => {
  it('lists Contribute for agents once launched, and never before', () => {
    expect(llmsTxtOf({ contribute: true })).toMatch(/^# GitRanks\n\n> .+\n\n## Contribute\n/);
    expect(llmsTxtOf({ contribute: true })).toContain('/contribute/agents.md');
    expect(llmsTxtOf({ contribute: false })).not.toContain('/contribute');
  });
});
