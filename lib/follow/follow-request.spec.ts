import { describe, expect, it } from 'vitest';

import { changeBodyOf, eventsOf, packagesOf, startBodyOf } from './follow-request';

const ALL = { notable: true, digest: true, milestones: true };
const pkg = (name: string) => ({ registry: 'npm', name });

describe('the follow routes’ bodies', () => {
  it('take 1 to 50 npm packages, each once, in their order', () => {
    expect(packagesOf([pkg('b'), pkg('@scope/a'), pkg('b')])).toEqual([pkg('b'), pkg('@scope/a')]);
    expect(packagesOf(Array.from({ length: 50 }, (_, at) => pkg(`p${at}`)))).toHaveLength(50);
  });

  it.each([
    ['none', []],
    ['more than 50', Array.from({ length: 51 }, (_, at) => pkg(`p${at}`))],
    ['another registry', [{ registry: 'pypi', name: 'x' }]],
    ['a name npm never takes', [pkg('../x')]],
    ['not a list', 'x'],
  ])('refuse packages: %s', (_, value) => {
    expect(packagesOf(value)).toBeNull();
  });

  it('take the switches only as three booleans', () => {
    expect(eventsOf(ALL)).toEqual(ALL);
    expect(eventsOf({ notable: true, digest: 'yes', milestones: true })).toBeNull();
    expect(eventsOf({ notable: true, digest: true })).toBeNull();
  });

  it('take a press with its channels once each, and never an address from the body', () => {
    expect(
      startBodyOf({ packages: [pkg('x')], events: ALL, channels: ['telegram', 'telegram'], email: 'ignored' }),
    ).toEqual({ packages: [pkg('x')], events: ALL, channels: ['telegram'] });
    expect(startBodyOf({ packages: [pkg('x')], events: ALL, channels: ['email'], email: 'me@example.com' })).toEqual({
      packages: [pkg('x')],
      events: ALL,
      channels: ['email'],
    });
  });

  it.each([
    ['no switch on', { events: { notable: false, digest: false, milestones: false }, channels: ['telegram'] }],
    ['no channel', { events: ALL, channels: [] }],
    ['an unknown channel', { events: ALL, channels: ['sms'] }],
  ])('refuse a press with %s', (_, rest) => {
    expect(startBodyOf({ packages: [pkg('x')], ...rest })).toBeNull();
  });

  it('take a change of one follow: switches, Unfollow or Undo, never Unfollow and Undo together', () => {
    expect(changeBodyOf({ followId: 'f1', remove: true })).toEqual({ followId: 'f1', remove: true });
    expect(changeBodyOf({ followId: 'f1', events: ALL })).toEqual({ followId: 'f1', events: ALL });
    expect(changeBodyOf({ followId: 'f1', remove: true, undo: true })).toBeNull();
    expect(changeBodyOf({ followId: 'f1' })).toBeNull();
    expect(changeBodyOf({ followId: '../x', remove: true })).toBeNull();
    expect(changeBodyOf({ followId: 'f1', remove: 'yes' })).toBeNull();
  });
});
