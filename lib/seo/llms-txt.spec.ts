import { describe, expect, it, vi } from 'vitest';

import { llmsTxtOf } from './llms-txt';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

describe('llms.txt', () => {
  it('lists Contribute for agents once launched, and never before', () => {
    expect(llmsTxtOf({ contribute: true, packages: false })).toMatch(/^# GitRanks\n\n> .+\n\n## Contribute\n/);
    expect(llmsTxtOf({ contribute: true, packages: false })).toContain('/contribute/agents.md');
    expect(llmsTxtOf({ contribute: true, packages: false })).toContain('Claude Code, Codex, ChatGPT, Cursor');
    expect(llmsTxtOf({ contribute: false, packages: false })).not.toContain('/contribute');
  });

  it('lists the packages once their pages are open to everyone, and never before', () => {
    const open = llmsTxtOf({ contribute: false, packages: true });

    expect(open).toMatch(/\n## Rankings and badges\n[\s\S]+\n## Packages\n\n- \[npm package rankings\]\(/);
    expect(open).toContain('(https://example.test/packages/npm/downloads/1)');
    expect(open).toContain('- Package page: https://example.test/package/npm/{name} — who uses an npm package');
    expect(open).toContain('- Repository "Used by": https://example.test/repo/{owner}/{name}/used-by — the same');
    expect(open).toContain('- [How package rankings work](https://example.test/methodology/packages)');
    expect(open.endsWith('\n')).toBe(true);
    expect(llmsTxtOf({ contribute: true, packages: false })).not.toMatch(/package/i);
  });

  it('adds the packages after everything else, which stays as it was', () => {
    const closed = llmsTxtOf({ contribute: true, packages: false });

    expect(llmsTxtOf({ contribute: true, packages: true }).startsWith(closed)).toBe(true);
  });
});
