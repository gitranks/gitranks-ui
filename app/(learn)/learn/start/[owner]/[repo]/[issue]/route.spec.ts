import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadStartPageWithMask } = vi.hoisted(() => ({ loadStartPageWithMask: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadStartPageWithMask }));
vi.mock('@/lib/seo/site', () => ({ SITE_URL: 'https://gitranks.com' }));

const { GET } = await import('./route');

const REF = { repo: 'acme/widgets', issue: 42 };
const ask = (owner: string, repo: string, issue: string) =>
  GET(new Request(`http://0.0.0.0:3000/learn/start/${owner}/${repo}/${issue}`), {
    params: Promise.resolve({ owner, repo, issue }),
  });
const answer = (refusal: string | null) => ({ ok: true, data: { refusal } });

beforeEach(() => {
  loadStartPageWithMask.mockReset();
});

describe("an issue's old start address under Learn's flow", () => {
  it("sends the person's own issue to its Start page from Learn, for now (307), kept by no cache", async () => {
    for (const read of [
      { answer: answer(null), maskId: null },
      { answer: answer('YOURS'), maskId: 'q7k2m9xa' },
    ]) {
      loadStartPageWithMask.mockResolvedValueOnce(read);
      const response = await ask('acme', 'widgets', '42');
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://gitranks.com/my/start/acme/widgets/42?from=learn');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(loadStartPageWithMask).toHaveBeenCalledWith(REF, 'fix');
  });

  it("sends any other issue to Learn's Issues, naming none: masked, closed to them, signed out, or a failed read", async () => {
    const reads = [
      () => loadStartPageWithMask.mockResolvedValueOnce({ answer: answer(null), maskId: 'q7k2m9xa' }),
      () => loadStartPageWithMask.mockResolvedValueOnce({ answer: { ok: false, error: 'NOT_FOUND' }, maskId: null }),
      () => loadStartPageWithMask.mockResolvedValueOnce(null),
      () => loadStartPageWithMask.mockRejectedValueOnce(new Error('down')),
    ];
    for (const read of reads) {
      read();
      const response = await ask('acme', 'widgets', '42');
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://gitranks.com/learn/issues');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('answers 404 for an address that names no issue, asking nothing', async () => {
    for (const [owner, repo, issue] of [
      ['acme', 'widgets', 'x'],
      ['acme', '..', '42'],
      ['-acme', 'widgets', '42'],
      ['acme', 'widgets', '0'],
    ]) {
      const response = await ask(owner, repo, issue);
      expect(response.status, `${owner}/${repo}/${issue}`).toBe(404);
    }
    expect(loadStartPageWithMask).not.toHaveBeenCalled();
  });
});
