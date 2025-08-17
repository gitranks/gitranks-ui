/* eslint-disable @typescript-eslint/no-explicit-any */
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { parseStringPromise } from 'xml2js';

const INDEXNOW_API_KEY = process.env.INDEXNOW_API_KEY!;
const host = 'gitranks.com';
const sitemaps = ['sitemap.xml', 'country/sitemap.xml', 'by/type/sitemap.xml', 'profile/login/sitemap.xml'] as const;

/* ---------- HTTP helpers ---------- */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

/* ---------- Sitemap parsing ---------- */
async function collectUrlsFromSitemap(sitemapUrl: string): Promise<string[]> {
  const xml = await fetchText(sitemapUrl);
  const parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });

  // <sitemapindex>
  if (parsed.sitemapindex?.sitemap) {
    const items = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap];
    const locs = items.map((s: { loc?: string }) => s.loc).filter(Boolean);
    const all: string[] = [];
    for (const loc of locs) all.push(...(await collectUrlsFromSitemap(loc)));
    return all;
  }

  // <urlset>
  if (parsed.urlset?.url) {
    const items = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
    return items.map((u: { loc?: string }) => u.loc).filter(Boolean);
  }
  return [];
}

async function collectAllUrlsFromSitemaps(sitemapUrls: string[]): Promise<string[]> {
  const arrays = await Promise.all(
    sitemapUrls.map(async (u) => {
      try {
        return await collectUrlsFromSitemap(u);
      } catch (e: unknown) {
        console.warn(`Failed to read ${u}: ${e instanceof Error ? e.message : e}`);
        return [] as string[];
      }
    }),
  );
  return [...new Set(arrays.flat())];
}

/* ---------- Utils ---------- */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function withRetries<T>(fn: () => Promise<T>, shouldRetry: (e: any, status?: number) => boolean, tries = 4) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      attempt++;
      const status = typeof e.status === 'number' ? e.status : undefined;
      if (attempt >= tries || !shouldRetry(e, status)) throw e;
      const backoff = Math.min(3000, 400 * Math.pow(2, attempt - 1)) + Math.random() * 250;
      await delay(backoff);
    }
  }
}

/* ---------- IndexNow endpoints ---------- */
/** searchengines.json -> each meta.json -> { api } */
async function getIndexNowApiEndpoints(): Promise<string[]> {
  type Engines = Record<string, string>;
  const engines = await fetchJson<Engines>('https://www.indexnow.org/searchengines.json');
  const metaUrls = Object.values(engines).filter(Boolean);

  const apis: string[] = [];
  for (const meta of metaUrls) {
    try {
      const j = await fetchJson<{ api?: string }>(meta);
      if (j?.api) apis.push(j.api.replace(/\/+$/, ''));
    } catch {
      // ignore broken meta
    }
  }
  if (apis.length === 0) apis.push('https://api.indexnow.org');
  return [...new Set(apis)];
}

async function postIndexNow(
  apiUrl: string,
  payload: {
    host: string;
    key: string;
    keyLocation: string;
    urlList: string[];
  },
): Promise<number> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!(res.status === 200 || res.status === 202)) {
    const err: any = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status;
}

/* ---------- Preflight: ensure key file is valid ---------- */
async function preflightKey(keyLocation: string, expectedKey: string) {
  try {
    const body = await fetchText(keyLocation);
    if (body.trim() !== expectedKey) {
      throw new Error(`Key file content mismatch at ${keyLocation}`);
    }
  } catch (e: any) {
    console.error(`Preflight failed: ${e?.message || e}`);
    console.error('Make sure KEY.txt is reachable and contains ONLY the key string.');
    process.exit(1);
  }
}

/* ---------- Main ---------- */
async function main() {
  const normalizedHost = host.replace(/\/+$/, '');
  const sitemapUrls = sitemaps.map((p) => `https://${normalizedHost}/${p.replace(/^\/+/, '')}`);
  const keyLocation = `https://${normalizedHost}/${INDEXNOW_API_KEY}.txt`;

  console.log('Resolved config:');
  console.log(' host        :', normalizedHost);
  console.log(' sitemaps    :', sitemapUrls);
  console.log(' key         :', INDEXNOW_API_KEY);
  console.log(' keyLocation :', keyLocation);

  await preflightKey(keyLocation, INDEXNOW_API_KEY);

  console.log('\nCollecting URLs from sitemaps...');
  const allUrlsRaw = await collectAllUrlsFromSitemaps(sitemapUrls);

  // (Optional) guard: only submit URLs for this host
  const allowedPrefixes = [`https://${normalizedHost}/`, `http://${normalizedHost}/`];
  const allUrls = allUrlsRaw.filter((u) => allowedPrefixes.some((p) => u.startsWith(p)));
  const dropped = allUrlsRaw.length - allUrls.length;
  if (dropped > 0) {
    console.warn(`Filtered out ${dropped} URL(s) not matching host ${normalizedHost}`);
  }

  console.log(`Found ${allUrls.length} URLs`);
  if (allUrls.length === 0) {
    console.error('No URLs found. Check your sitemaps/host.');
    process.exit(1);
  }

  const batches = chunk(allUrls, 10_000);

  const endpoints = await getIndexNowApiEndpoints();
  console.log('Resolved IndexNow APIs:', endpoints);

  for (const api of endpoints) {
    console.log(`\nSubmitting to ${api} ...`);
    let i = 0;

    for (const list of batches) {
      i++;
      const payload = { host: normalizedHost, key: INDEXNOW_API_KEY, keyLocation, urlList: list };

      try {
        const status = await withRetries(
          () => postIndexNow(api, payload),
          // retry on 429/5xx/network; for 403 don't loop
          (err: any, status?: number) => {
            if (status === 403) return false;
            if (status === 429) return true;
            if (status && status >= 500) return true;
            const msg = (err && err.message) || '';
            return /ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg);
          },
          3,
        );
        console.log(`  Batch ${i}/${batches.length} -> ${status} ✓`);
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.warn(`  Batch ${i}/${batches.length} FAILED: ${msg} !`);
        if (/ENOTFOUND/i.test(msg)) {
          console.warn('  Skipping this engine due to DNS resolution failure.');
          break;
        }
      }

      if (batches.length > 1) await delay(250);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
