import { afterEach, describe, expect, it, vi } from 'vitest';

import { readSkillsBrief } from './skills-brief-read';
import { contributorNumbers } from '@/lib/skills/__fixtures__/skills';

const answer = { brief: { login: 'octocat', numbers: contributorNumbers }, learnOpen: false };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a person's Skills numbers read in the browser", () => {
  it('asks once while a read is on its way, whoever asks, in any spelling of the login', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(answer)));
    vi.stubGlobal('fetch', fetch);
    const [tab, block] = await Promise.all([readSkillsBrief('octocat'), readSkillsBrief('OctoCat')]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/skills/octocat');
    expect(tab).toEqual(answer);
    expect(block).toEqual(answer);
  });

  it('asks again once the last read is in, so a later page reads the browser’s own copy', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(answer)));
    vi.stubGlobal('fetch', fetch);
    await readSkillsBrief('octocat');
    await readSkillsBrief('octocat');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('answers null on a refusal or a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('no', { status: 500 })),
    );
    expect(await readSkillsBrief('octocat')).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await readSkillsBrief('octocat')).toBeNull();
  });
});
