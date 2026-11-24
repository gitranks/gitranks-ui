import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/pull-requests/driftwood-js/driftwood/871',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadIssues: vi.fn(),
  loadAttempt: vi.fn(),
  loadAttempts: vi.fn(),
}));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadIssues: vi.fn() }));
const { DiffViewer, LARGE_FILE_LINES, MAX_FILE_LINES, MAX_TOTAL_LINES } = await import(
  '@/components/workspace/diff-viewer'
);
const { ReviewsReady } = await import('@/components/workspace/reviews-ready');
const { PATCH, attempt } = await import('@/lib/contribute/__fixtures__/contribute-attempts');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

describe('the diff viewer', () => {
  it('shows each file with its added and removed lines, and the totals', () => {
    const html = renderToStaticMarkup(<DiffViewer patch={PATCH} />);
    const plain = text(html);

    expect(html).toContain('data-file="src/router/layout-cache.ts"');
    expect(html).toContain('data-file="src/router/normalize-path.ts"');
    expect(html).toContain('data-file="test/layout-cache.spec.ts"');
    expect(plain).toContain('+8 −2 · 3 files');
    expect(plain).toContain('new');
    expect((html.match(/data-line="add"/g) ?? []).length).toBe(8);
    expect((html.match(/data-line="del"/g) ?? []).length).toBe(2);
    expect(plain).not.toContain('Subject:');
  });

  it('escapes everything in the patch: it is untrusted text', () => {
    const html = renderToStaticMarkup(
      <DiffViewer
        patch={`${PATCH}\ndiff --git a/<img src=x onerror=alert(1)>.ts b/<img src=x onerror=alert(1)>.ts\n`}
      />,
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; friends');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;.ts');
  });

  it('collapses a large file and leaves the others open', () => {
    const many = Array.from({ length: LARGE_FILE_LINES + 5 }, (_, index) => `+line ${index}`).join('\n');
    const patch = `${PATCH}\ndiff --git a/big.json b/big.json\n--- a/big.json\n+++ b/big.json\n@@ -0,0 +1,${LARGE_FILE_LINES + 5} @@\n${many}\n`;
    const html = renderToStaticMarkup(<DiffViewer patch={patch} />);

    expect(html).toMatch(/<details data-file="big.json" data-large="true" data-truncated="false" class="[^"]*">/);
    expect(html).toMatch(/<details open="" data-file="src\/router\/layout-cache.ts" data-large="false"/);
    expect(text(html)).toContain(`${LARGE_FILE_LINES + 6} lines, collapsed`);
  });

  it('says when the diff is not available yet', () => {
    expect(text(renderToStaticMarkup(<DiffViewer patch={null} />))).toContain('The diff is not available yet.');
  });
});

describe('the attempts waiting for review', () => {
  const waiting = [attempt(), attempt({ attemptId: 'A_2', state: 'RUNNING' })];

  it('links each attempt in review to its review screen', () => {
    const html = renderToStaticMarkup(<ReviewsReady attempts={waiting} />);

    expect(html).toContain('data-reviews-ready="1"');
    expect(html).toContain('href="/my/pull-requests/by-attempt/A_1"');
    expect(html).not.toContain('A_2');
    expect(text(html)).toContain('A change is ready for your review');
  });

  it('shows nothing when none waits, or the API does not answer', () => {
    expect(renderToStaticMarkup(<ReviewsReady attempts={[]} />)).toBe('');
    expect(renderToStaticMarkup(<ReviewsReady attempts={undefined} />)).toBe('');
  });
});

/** A one-file diff of `count` added lines. */
const addedLines = (path: string, count: number) =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -0,0 +1,${count} @@\n${Array.from(
    { length: count },
    (_, index) => `+line ${index}`,
  ).join('\n')}\n`;

describe('the diff viewer, defended', () => {
  it('still shows the lines of a file marked binary', () => {
    const patch = `diff --git a/src/a.ts b/src/a.ts\nBinary files a/src/a.ts and b/src/a.ts differ\n@@ -0,0 +1 @@\n+fetch(process.env.TOKEN)\n`;
    const html = renderToStaticMarkup(<DiffViewer patch={patch} />);

    expect(text(html)).toContain('+fetch(process.env.TOKEN)');
    expect(text(html)).toContain('A binary file: its content is not shown.');
  });

  it('cuts a file past the most lines shown for one file, and says so', () => {
    const html = renderToStaticMarkup(<DiffViewer patch={addedLines('big.ts', MAX_FILE_LINES + 10)} />);

    expect((html.match(/data-line="add"/g) ?? []).length).toBe(MAX_FILE_LINES - 1);
    expect(html).toContain('data-truncated="true"');
    expect(text(html)).toContain('Showing 2,000 of 2,011 lines.');
    expect(text(html)).toContain('Read it all on GitHub once the pull request is open.');
    expect(text(html)).toContain(`+${MAX_FILE_LINES + 10}`);
  });

  it('cuts the whole patch past the most lines shown, file by file', () => {
    const files = Array.from({ length: 6 }, (_, index) => addedLines(`f${index}.ts`, MAX_FILE_LINES - 1)).join('');
    const html = renderToStaticMarkup(<DiffViewer patch={files} />);

    expect((html.match(/data-line=/g) ?? []).length).toBe(MAX_TOTAL_LINES);
    expect(html).toMatch(/data-file="f4.ts" data-large="true" data-truncated="false"/);
    expect(html).toMatch(/data-file="f5.ts" data-large="true" data-truncated="true"/);
    expect(text(html)).toContain('2,000 lines, past the most shown for one patch.');
  });

  it('marks where the next commit starts in a file two commits changed', () => {
    const one = 'From 1111111 Mon Sep 17 00:00:00 2001\nSubject: [PATCH 1/2] One\n\n---\n';
    const two = '-- \n2.47.0\n\nFrom 2222222 Mon Sep 17 00:00:00 2001\nSubject: [PATCH 2/2] Two\n\n---\n';
    const html = renderToStaticMarkup(
      <DiffViewer patch={`${one}${addedLines('a.ts', 1)}${two}${addedLines('a.ts', 1)}`} />,
    );

    expect(html).toContain('data-line="commit"');
    expect(text(html)).toContain('Next commit: Two');
  });
});
