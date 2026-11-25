import { describe, expect, it } from 'vitest';

import {
  FROM_ISSUE_LINE,
  type StartWaysRead,
  startWaysOf,
  startWaysReadOf,
  VISITOR_LINE,
  withWayBack,
} from './start-ways';

const BASE: StartWaysRead = {
  signedIn: true,
  sign: false,
  own: null,
  key: 'none',
  attempt: false,
  issue: null,
  issueReads: false,
};

/** Each box as one line: name, top line, button label → where, filled or not, small. */
const shape = (read: Partial<StartWaysRead>) => {
  const ways = startWaysOf({ ...BASE, ...read });
  return {
    head: ways.headLine,
    boxes: ways.boxes.map(
      (box) =>
        `${box.name} | ${box.top.tone}: ${box.top.text} | ${
          box.button ? `${box.button.label} → ${box.button.href}${box.button.filled ? ' (filled)' : ''}` : '-'
        }${box.small ? ` | small: ${box.small.line}` : ''}`,
    ),
    next: ways.next ? `${ways.next.label} → ${ways.next.href}` : null,
  };
};

const PICK =
  'An agent writes each fix, and you read it before anything reaches GitHub. Pick one way now. You can add the other later.';

describe('startWaysOf', () => {
  it.each<[string, Partial<StartWaysRead>, ReturnType<typeof shape>]>([
    [
      'a visitor: both buttons sign in, then open the way they name',
      { signedIn: false },
      {
        head: PICK,
        boxes: [
          'own | brand: Recommended | Sign in and connect your agent → /contribute/start/agent/own (filled)',
          'key | brand: No terminal needed | Sign in and use a Claude key → /contribute/start/agent/key',
        ],
        next: null,
      },
    ],
    [
      'signed in, nothing connected',
      {},
      {
        head: PICK,
        boxes: [
          'own | brand: Recommended | Connect your agent → /contribute/start/agent/own (filled)',
          'key | brand: No terminal needed | Use a Claude key → /contribute/start/agent/key',
        ],
        next: null,
      },
    ],
    [
      'a key that stopped working, nothing else, no sign: the flow key step',
      { key: 'invalid' },
      {
        head: PICK,
        boxes: [
          'own | brand: Recommended | Connect your agent → /contribute/start/agent/own (filled)',
          'key | warning: Your Claude key stopped working. | Replace your key → /contribute/start/agent/key',
        ],
        next: null,
      },
    ],
    [
      'a key that stopped working, with the sign: the Agent tab replaces it',
      { key: 'invalid', sign: true },
      {
        head: PICK,
        boxes: [
          'own | brand: Recommended | Connect your agent → /my/agent/connect (filled)',
          'key | warning: Your Claude key stopped working. | Replace your key → /my/agent/key?replace=1',
        ],
        next: null,
      },
    ],
    [
      'own agent connected, no sign: done, Continue, the key smaller',
      { own: 'Claude Code' },
      {
        head: PICK,
        boxes: [
          'own | done: Claude Code is connected. | Continue → /contribute/start/issue (filled)',
          'key | brand: No terminal needed | Use a Claude key → /contribute/start/agent/key | small: No terminal needed. You can add it later.',
        ],
        next: null,
      },
    ],
    [
      'own agent with no known name, no sign',
      { own: '' },
      {
        head: PICK,
        boxes: [
          'own | done: Your agent is connected. | Continue → /contribute/start/issue (filled)',
          'key | brand: No terminal needed | Use a Claude key → /contribute/start/agent/key | small: No terminal needed. You can add it later.',
        ],
        next: null,
      },
    ],
    [
      'a key connected, no sign: the same the other way round',
      { key: 'connected' },
      {
        head: PICK,
        boxes: [
          'key | done: Your Claude key is connected. | Continue → /contribute/start/issue (filled)',
          'own | brand: Recommended | Connect your agent → /contribute/start/agent/own | small: Recommended. You can add it later.',
        ],
        next: null,
      },
    ],
    [
      'both connected, no sign: both done at full size, one Continue under them',
      { own: 'Codex', key: 'connected' },
      {
        head: PICK,
        boxes: ['own | done: Codex is connected. | -', 'key | done: Your Claude key is connected. | -'],
        next: 'Continue → /contribute/start/issue',
      },
    ],
    [
      'own agent connected, with the sign',
      { own: 'Claude Code', sign: true },
      {
        head: 'Claude Code is connected, so you are ready. Go on to your first issue, or add the other way as well.',
        boxes: [
          'own | done: Connected · Claude Code | Go to your first issue → /contribute/start/issue (filled)',
          'key | brand: No terminal needed | Add a Claude key too → /my/agent/key',
        ],
        next: null,
      },
    ],
    [
      'a key connected, with the sign',
      { key: 'connected', sign: true },
      {
        head: 'Your Claude key is connected, so you are ready. Go on to your first issue, or add the other way as well.',
        boxes: [
          'own | brand: Recommended | Connect your own agent too → /my/agent/connect',
          'key | done: Connected · your Claude key | Go to your first issue → /contribute/start/issue (filled)',
        ],
        next: null,
      },
    ],
    [
      'both connected, with the sign: the own agent filled',
      { own: 'Claude Code', key: 'connected', sign: true },
      {
        head: 'Both ways are connected, so you are ready. Go on to your first issue.',
        boxes: [
          'own | done: Connected · Claude Code | Go to your first issue → /contribute/start/issue (filled)',
          'key | done: Connected · your Claude key | Go to your first issue → /contribute/start/issue',
        ],
        next: null,
      },
    ],
    [
      'with the sign and an attempt: Go to your issues, to Contribute home',
      { own: 'Claude Code', sign: true, attempt: true },
      {
        head: 'Claude Code is connected, so you are ready. Go on to your first issue, or add the other way as well.',
        boxes: [
          'own | done: Connected · Claude Code | Go to your issues → /contribute (filled)',
          'key | brand: No terminal needed | Add a Claude key too → /my/agent/key',
        ],
        next: null,
      },
    ],
  ])('%s', (_case, read, expected) => {
    expect(shape(read)).toEqual(expected);
  });

  it('draws the visitor line only for a visitor', () => {
    expect(startWaysOf({ ...BASE, signedIn: false }).visitorLine).toBe(VISITOR_LINE);
    expect(startWaysOf(BASE).visitorLine).toBeNull();
  });

  it('marks the visitor buttons as a sign-in, and no other', () => {
    expect(startWaysOf({ ...BASE, signedIn: false }).boxes.map((box) => box.button?.signIn)).toEqual([true, true]);
    expect(startWaysOf(BASE).boxes.map((box) => box.button?.signIn)).toEqual([false, false]);
  });

  it('keeps the way back on every button, and says it only while the issue still reads', () => {
    const visitor = startWaysOf({ ...BASE, signedIn: false, issue: 'm_abc', issueReads: true });
    expect(visitor.fromIssueLine).toBe(FROM_ISSUE_LINE);
    expect(visitor.boxes.map((box) => box.button?.href)).toEqual([
      '/contribute/start/agent/own?issue=m_abc',
      '/contribute/start/agent/key?issue=m_abc',
    ]);
    const both = startWaysOf({ ...BASE, own: 'Codex', key: 'connected', issue: 'm_abc', issueReads: false });
    expect(both.fromIssueLine).toBeNull();
    expect(both.next?.href).toBe('/contribute/start/issue?issue=m_abc');
    const replace = startWaysOf({ ...BASE, sign: true, key: 'invalid', issue: 'm_abc', issueReads: true });
    expect(replace.boxes[1].button?.href).toBe('/my/agent/key?replace=1&issue=m_abc');
  });
});

describe('withWayBack', () => {
  it.each([
    ['/contribute/start/issue', null, '/contribute/start/issue'],
    ['/contribute/start/issue', 'm_1', '/contribute/start/issue?issue=m_1'],
    ['/my/agent/key?replace=1', 'm_1', '/my/agent/key?replace=1&issue=m_1'],
    ['/contribute/start?issue=old', 'm_1', '/contribute/start?issue=m_1'],
    // Not a mask id: no way back is written.
    ['/my/agent/key?replace=1', 'm 1', '/my/agent/key?replace=1'],
    ['/contribute/start', '../x', '/contribute/start'],
  ])('%s with %s', (href, issue, expected) => {
    expect(withWayBack(href, issue)).toBe(expected);
  });
});

describe('startWaysReadOf: the first step’s facts from the gate and the view', () => {
  const open = (contribute: boolean | null, entered = false) =>
    ({ kind: 'open', entered, signs: { contribute, learn: null }, agents: { hosted: false, own: false } }) as const;
  const token = (patch: object) => ({ id: 't', name: 'Claude Code', lastUsedAt: null, kind: 'TOKEN', ...patch });
  const view = (tokens: object[], state: string | null) =>
    ({
      contributor: { credentials: state ? [{ provider: 'ANTHROPIC', state }] : [] },
      ownAgent: { paths: { hosted: false, mcp: tokens.length > 0 }, tokens },
    }) as never;
  const read = (gate: Parameters<typeof startWaysReadOf>[0]['gate'], v: never) =>
    startWaysReadOf({ gate, view: v, attempt: false, issue: null, issueReads: false });

  it('a visitor: not signed in, no sign, nothing connected', () => {
    expect(read({ kind: 'signed-out' }, null as never)).toMatchObject({
      signedIn: false,
      sign: false,
      own: null,
      key: 'none',
    });
  });

  it('names a used own agent, leaves an unused token out, and reads the key’s state', () => {
    expect(read(open(false), view([token({ lastUsedAt: '2026-11-25T09:00:00.000Z' })], null))).toMatchObject({
      own: 'Claude Code',
      key: 'none',
    });
    expect(read(open(false), view([token({})], 'VALID'))).toMatchObject({ own: null, key: 'connected' });
    expect(read(open(false), view([], 'INVALID'))).toMatchObject({ own: null, key: 'invalid' });
    expect(read(open(false), view([token({ kind: 'OAUTH', name: 'my laptop' })], null))).toMatchObject({ own: '' });
  });

  it('reads the Contribute sign, and today’s rule while it is not known', () => {
    expect(read(open(true), view([], null)).sign).toBe(true);
    expect(read(open(false, true), view([], null)).sign).toBe(false);
    expect(read(open(null, true), view([], null)).sign).toBe(true);
  });
});
