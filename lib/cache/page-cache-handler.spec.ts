import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const PageCacheHandler = require('./page-cache-handler.cjs');
const { isMemoryOnly } = PageCacheHandler;

const ROUTE = '/route-cache/APP_PAGE/0f00000000000000000000000000000000000000000000000000000000000000/$';
const APP_PAGE = { kind: 'APP_PAGE', isRoutePPREnabled: true, isFallback: false };

const distDir = mkdtempSync(join(tmpdir(), 'page-cache-'));
afterAll(() => rmSync(distDir, { recursive: true, force: true }));

/** Node's file system the way Next's cache reads and writes it. */
const cacheFs = {
  existsSync,
  readFile: (path: string, encoding?: BufferEncoding) => fs.readFile(path, encoding ?? null),
  writeFile: (path: string, data: string | Buffer) => fs.writeFile(path, data),
  mkdir: (dir: string) => fs.mkdir(dir, { recursive: true }),
  stat: (path: string) => fs.stat(path),
};

const handler = new PageCacheHandler({
  fs: cacheFs,
  serverDistDir: distDir,
  flushToDisk: true,
  revalidatedTags: [],
  maxMemoryCacheSize: 5 * 1024 * 1024,
});

const page = (tags: string) => ({
  kind: 'APP_PAGE',
  html: '<html>page</html>',
  rscData: Buffer.from('rsc'),
  postponed: undefined,
  headers: { 'x-next-cache-tags': tags },
  status: 200,
  segmentData: undefined,
});
const setCtx = { cacheControl: { revalidate: 3600, expire: 86400 }, isRoutePPREnabled: true, isFallback: false };
const onDisk = (pathname: string) => existsSync(join(distDir, `${ROUTE}${pathname}.html`));

describe('page cache handler', () => {
  it('keeps the pages of a developer, an organization, a repository or a post in memory only', () => {
    for (const pathname of [
      '/profile/torvalds',
      '/profile/torvalds/ranks',
      '/org/vercel',
      '/repo/react/react',
      '/insights/6650f0c2a1b2c3d4e5f60718',
    ]) {
      expect(isMemoryOnly(`${ROUTE}${pathname}`)).toBe(true);
    }
    for (const pathname of ['/by/stars/2', '/orgs/3', '/repos/1', '/insights', '/', '/repository/x']) {
      expect(isMemoryOnly(`${ROUTE}${pathname}`)).toBe(false);
    }
    expect(isMemoryOnly('a-fetch-cache-key')).toBe(false);
  });

  it('writes such a page nowhere on disk but serves it from memory', async () => {
    await handler.set(`${ROUTE}/profile/octo-dev`, page('profile:octo-dev'), setCtx);

    expect(onDisk('/profile/octo-dev')).toBe(false);
    expect((await handler.get(`${ROUTE}/profile/octo-dev`, APP_PAGE))?.value.html).toBe('<html>page</html>');
  });

  it('writes every other page to disk as before', async () => {
    await handler.set(`${ROUTE}/by/stars/2`, page('_N_T_/by/stars/2'), setCtx);

    expect(onDisk('/by/stars/2')).toBe(true);
  });

  it('stops serving a kept page once a refresh expires its tag', async () => {
    await handler.set(`${ROUTE}/repo/acme/rocket`, page('_N_T_/layout,repo:acme/rocket'), setCtx);
    expect(await handler.get(`${ROUTE}/repo/acme/rocket`, APP_PAGE)).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 5));
    await handler.revalidateTag('repo:acme/rocket', { expire: 0 });

    expect(await handler.get(`${ROUTE}/repo/acme/rocket`, APP_PAGE)).toBeNull();
  });
});
