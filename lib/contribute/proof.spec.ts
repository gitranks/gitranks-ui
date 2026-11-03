import { describe, expect, it } from 'vitest';

import { mcpToken, NOW, views } from './__fixtures__/contribute-views';
import { nextForProof, nextForYou, proofAsk, proofResult, proofSession, prsNeedingYou } from './__fixtures__/needs-you';
import type { ContributeContribution, ContributeProof } from './contribute.types';
import { needsYouItemsOf } from './needs-you';
import { contributionOf, nextStepOf, nextStepWaits } from './next-step';
import {
  agentConnectedOf,
  askedForOf,
  lastUsedTokenOf,
  proofImageSrcOf,
  proofParamOf,
  proofPromptOf,
  proofStageOf,
  proofWaits,
} from './proof';
import { proofTileStageOf, sessionsOf } from './sessions';

const proof = (patch: Partial<ContributeProof> = {}): ContributeProof => ({ ask: proofAsk(), session: null, ...patch });

describe('proofStageOf', () => {
  it('asks to connect the agent first, or for the prompt once one has called; nothing without an ask', () => {
    expect(proofStageOf(proof(), false, NOW)).toBe('not-connected');
    expect(proofStageOf(proof(), true, NOW)).toBe('connected');
    expect(proofStageOf(proof({ session: proofSession({ state: 'WAITING' }) }), true, NOW)).toBe('connected');
    expect(proofStageOf(proof({ ask: null }), true, NOW)).toBeNull();
    expect(proofStageOf(null, true, NOW)).toBeNull();
  });

  it('tells the agent at work, and what it came back with', () => {
    for (const state of ['RUNNING', 'UPLOADING', 'CHECKING'] as const) {
      expect(proofStageOf(proof({ session: proofSession({ state }) }), true, NOW)).toBe('working');
    }
    const back = (outcome: 'PROVED' | 'CANNOT_PROVE' | 'FIX_BROKEN') =>
      proofStageOf(proof({ session: proofSession({ state: 'REVIEW', result: proofResult({ outcome }) }) }), true, NOW);
    expect([back('PROVED'), back('CANNOT_PROVE'), back('FIX_BROKEN')]).toEqual(['review', 'cannot', 'fix-broken']);
    // Nothing the page can show: an unknown outcome, a proof without its section.
    const unknown = proofResult({ outcome: 'SOMETHING' as never });
    expect(proofStageOf(proof({ session: proofSession({ state: 'REVIEW', result: unknown }) }), true, NOW)).toBe(
      'unreadable',
    );
    const bare = proofResult({ section: null });
    expect(proofStageOf(proof({ session: proofSession({ state: 'REVIEW', result: bare }) }), true, NOW)).toBe(
      'unreadable',
    );
    expect(proofStageOf(proof({ session: proofSession({ state: 'REVIEW', result: null }) }), true, NOW)).toBe(
      'unreadable',
    );
  });

  it('tells posting, a post that failed, and a posted proof until the bot asks again after it', () => {
    expect(proofStageOf(proof({ session: proofSession({ state: 'POSTING' }) }), true, NOW)).toBe('posting');
    expect(proofStageOf(proof({ session: proofSession({ state: 'FAILED' }) }), true, NOW)).toBe('failed');
    const posted = proofSession({ state: 'POSTED', stateAt: '2026-10-28T11:00:00.000Z' });
    expect(proofStageOf(proof({ session: posted }), true, NOW)).toBe('posted');
    // The bot read it and asks again: a new proof may start.
    const askedAgain = proof({ ask: proofAsk({ at: '2026-10-28T11:30:00.000Z' }), session: posted });
    expect(proofStageOf(askedAgain, true, NOW)).toBe('connected');
    // The ask gone (the bot let it through): shown a week, then not.
    expect(proofStageOf(proof({ ask: null, session: posted }), true, NOW)).toBe('posted');
    expect(proofStageOf(proof({ ask: null, session: posted }), true, new Date('2026-11-05T12:00:00.000Z'))).toBeNull();
  });

  it('says a discarded proof ended because the bot no longer asks, and starts over when it still does', () => {
    const cleared = proofSession({
      state: 'DISCARDED',
      endedReason: 'ASK_CLEARED',
      stateAt: '2026-10-28T11:00:00.000Z',
    });
    expect(proofStageOf(proof({ ask: null, session: cleared }), true, NOW)).toBe('ask-cleared');
    const discarded = proofSession({ state: 'DISCARDED', endedReason: 'DISCARDED' });
    expect(proofStageOf(proof({ ask: null, session: discarded }), true, NOW)).toBeNull();
    expect(proofStageOf(proof({ session: discarded }), false, NOW)).toBe('not-connected');
  });

  it('counts only the stages the user or their agent still acts on', () => {
    expect(proofWaits('connected')).toBe(true);
    expect(proofWaits('working')).toBe(true);
    expect(proofWaits('posted')).toBe(false);
    expect(proofWaits('ask-cleared')).toBe(false);
    expect(proofWaits(null)).toBe(false);
  });
});

describe('the words and paths of a proof', () => {
  it('names the prompt, the ask and the token the agent used last', () => {
    expect(proofPromptOf('openclaw/openclaw', 190186)).toBe('Prove openclaw/openclaw#190186 for GitRanks');
    expect(askedForOf('Add real behavior proof')).toBe('real behavior proof');
    expect(askedForOf('Show proof of the fix.')).toBe('proof of the fix');
    expect(askedForOf('Prove it works')).toBe('proof: “Prove it works”');
    expect(agentConnectedOf({ ownAgent: undefined })).toBe(false);
    const used = { ...views.active, ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken()] } };
    expect(agentConnectedOf(used)).toBe(false);
    const tokens = [
      mcpToken({ id: 'T_1', lastUsedAt: '2026-10-28T09:00:00.000Z' }),
      mcpToken({ id: 'T_2', lastUsedAt: '2026-10-28T10:00:00.000Z' }),
      mcpToken({ id: 'T_3' }),
    ];
    expect(agentConnectedOf({ ownAgent: { paths: used.ownAgent.paths, tokens } })).toBe(true);
    expect(lastUsedTokenOf(tokens)?.id).toBe('T_2');
  });

  it("gives an image the proof's own route only for a screenshot it has", () => {
    const slots = new Set([1, 2]);
    expect(proofImageSrcOf('proof:2', 'PF_1', slots)).toBe('/api/me/contribute/proofs/PF_1/files/2');
    expect(proofImageSrcOf('proof:3', 'PF_1', slots)).toBeNull();
    expect(proofImageSrcOf('https://example.com/x.png', 'PF_1', slots)).toBeNull();
    expect(proofImageSrcOf('proof:12', 'PF_1', slots)).toBeNull();
  });

  it('reads a sane attempt id from the connect page’s address, and nothing else', () => {
    expect(proofParamOf('A_OC')).toBe('A_OC');
    expect(proofParamOf(['A_OC', 'B'])).toBe('A_OC');
    expect(proofParamOf('../x')).toBeNull();
    expect(proofParamOf(undefined)).toBeNull();
  });
});

describe('the next step with a proof', () => {
  it("gives the bot's block to the proof's card, and the run's no-go finding a card of its own", () => {
    const step = nextStepOf({ ...nextForProof.connected, needsYou: nextForYou.needsYou }, true, NOW);
    const [first, second] = step.user;
    expect(first).toMatchObject({ kind: 'proof', kinds: ['BOT_BLOCKED'], stage: 'connected', waits: true });
    expect(second).toMatchObject({ kind: 'found', kinds: ['RUN_ENDED'], bot: null });
    expect(nextStepWaits(step)).toBe(true);
  });

  it('keeps the found card for a block when no proof is asked, and for a pull request opened by hand', () => {
    expect(nextStepOf(nextForYou, true, NOW).user[0]).toMatchObject({
      kind: 'found',
      kinds: ['BOT_BLOCKED', 'RUN_ENDED'],
    });
    const byHand = nextStepOf({ ...nextForProof.connected, openedBy: 'HAND' }, true, NOW);
    expect(byHand.user.map(({ kind }) => kind)).toEqual(['found']);
  });

  it('tells a posted proof and puts a newer block back on the found card', () => {
    const later = nextStepOf(
      {
        ...nextForProof.posted,
        needsYou: {
          since: '2026-10-28T11:58:00.000Z',
          signals: [{ kind: 'BOT_BLOCKED', at: '2026-10-28T11:58:00.000Z', detail: 'clawsweeper: Needs changes' }],
        },
      },
      true,
      NOW,
    );
    expect(later.user).toMatchObject([
      { kind: 'proof', stage: 'posted', kinds: [], bot: null },
      { kind: 'found', kinds: ['BOT_BLOCKED'], bot: { by: 'clawsweeper', verdict: 'Needs changes' } },
    ]);
    expect(nextStepWaits(later)).toBe(true);
  });

  it('tells a posted proof without counting it as waiting', () => {
    const step = nextStepOf({ ...nextForProof.posted, needsYou: null }, true, NOW);
    expect(step.user).toMatchObject([{ kind: 'proof', stage: 'posted', waits: false }]);
    expect(step.user.some((move) => move.kind !== 'proof' || move.waits)).toBe(false);
  });

  it('shows the tile, and so the next step, on our own open pull request while no run is under way', () => {
    expect(proofTileStageOf(nextForProof.posted, true, NOW)).toBe('posted');
    expect(proofTileStageOf({ ...nextForProof.posted, openedBy: 'HAND' }, true, NOW)).toBeNull();
    const running = { ...nextForProof.posted, followUps: { ...nextForYou.followUps!, currentAttemptId: 'A_OC2' } };
    expect(proofTileStageOf(running, true, NOW)).toBeNull();
  });

  it("lists a proof's tile beside the runs, marked on the next step", () => {
    const tiles = sessionsOf(nextForProof.review, undefined, { agentConnected: true, now: NOW });
    // The proof's tile has the next step's key, so the address marks it; the run's tile beside it its own.
    expect(tiles.map(({ key, href }) => [key, href])).toEqual([
      ['A_OC', '/contribute/attempts/A_OC'],
      ['A_OC1', '/contribute/attempts/A_OC/runs/A_OC1'],
      ['next', '/contribute/attempts/A_OC?session=next'],
      ['next-run', '/contribute/attempts/A_OC?session=next#next-run'],
    ]);
    expect(tiles.find(({ key }) => key === 'next')).toMatchObject({
      title: 'Proof · your agent',
      pill: { label: 'Check it', tone: 'amber' },
      meta: 'Waits for you',
    });
    const none = sessionsOf(nextForYou, undefined, { agentConnected: true, now: NOW });
    expect(none.map(({ key }) => key)).toEqual(['A_OC', 'A_OC1', 'next']);
  });
});

describe("Needs you's row for a proof", () => {
  const rowOf = (pr: ContributeContribution) =>
    needsYouItemsOf({ view: views.active, reviews: [], replies: [], contributions: [pr], runs: [], now: NOW }).items[0];
  const withProof = (first: typeof nextForProof.connected) => contributionOf(first) as ContributeContribution;

  it('asks for the proof with the bot’s words, and leads to the next step', () => {
    const row = rowOf(withProof(nextForProof.connected));
    expect(row).toMatchObject({
      kind: 'proof',
      pill: 'Proof needed',
      move: 'clawsweeper asks for real behavior proof. Your own agent can capture it on your machine.',
      action: { label: 'Get the proof', href: '/contribute/attempts/A_OC?session=next' },
      working: false,
    });
  });

  it('tells the agent at work, the proof to check, a failed post and a posted one', () => {
    expect(rowOf(withProof(nextForProof.working))).toMatchObject({
      kind: 'proof-working',
      pill: 'Your agent',
      working: true,
    });
    expect(rowOf(withProof(nextForProof.review))).toMatchObject({
      kind: 'proof-review',
      pill: 'Check the proof',
      action: { label: 'Check the proof' },
    });
    expect(rowOf(withProof(nextForProof.cannot))).toMatchObject({ kind: 'proof-review', action: { label: 'Read it' } });
    expect(rowOf(withProof(nextForProof.failed))).toMatchObject({
      kind: 'proof-failed',
      tone: 'red',
      move: 'Posting the proof failed; its page says why. Try again, or discard it.',
    });
    expect(rowOf(withProof(nextForProof.posted))).toMatchObject({
      kind: 'proof-posted',
      pill: 'Bot reads it',
      working: true,
    });
  });

  it('keeps a proof that waits on the user after the block was marked handled', () => {
    const handled = { ...withProof(nextForProof.review), needsYou: null };
    expect(rowOf(handled)).toMatchObject({ kind: 'proof-review', pill: 'Check the proof' });
    expect(rowOf({ ...withProof(nextForProof.failed), needsYou: null })).toMatchObject({ kind: 'proof-failed' });
  });

  it("gives a block raised after the proof was posted the bot's own row", () => {
    const pr = withProof(nextForProof.posted);
    const later = {
      ...pr,
      needsYou: {
        since: '2026-10-28T11:58:00.000Z',
        signals: [
          {
            kind: 'BOT_BLOCKED' as const,
            at: '2026-10-28T11:58:00.000Z',
            detail: 'clawsweeper: Needs changes before merge: Rename the flag',
          },
        ],
      },
    };
    expect(rowOf(later)).toMatchObject({ kind: 'bot', working: false });
  });

  it("keeps the bot's own row without a proof, and on a pull request opened by hand", () => {
    expect(rowOf(prsNeedingYou.found).kind).not.toMatch(/^proof/);
    expect(rowOf({ ...withProof(nextForProof.connected), openedBy: 'HAND' }).kind).toBe('bot');
  });
});
