// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => ({ signIn }));

const { signInToFlow } = await import('./sign-in-to-flow');
const { flowWayBackHereOf, flowWayBackOf, withFlowWayBack } = await import('./flow-way-back');

describe('signInToFlow: a visitor’s sign-in from the first step', () => {
  beforeEach(() => signIn.mockClear());

  it('signs in to the connect step it names, with the way back the address carries', async () => {
    window.history.replaceState(null, '', '/contribute/start?issue=q7k2m9xa');
    await signInToFlow('/contribute/start/agent/own');
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/contribute/start/agent/own?issue=q7k2m9xa' });

    await signInToFlow('/contribute/start/agent/key?issue=q7k2m9xa');
    expect(signIn).toHaveBeenLastCalledWith('github-basic', {
      redirectTo: '/contribute/start/agent/key?issue=q7k2m9xa',
    });
  });

  it('adds nothing without a way back, or with one that is not an issue’s id', async () => {
    window.history.replaceState(null, '', '/contribute/start');
    await signInToFlow('/contribute/start/agent/key');
    expect(signIn).toHaveBeenLastCalledWith('github-basic', { redirectTo: '/contribute/start/agent/key' });

    window.history.replaceState(null, '', '/contribute/start/agent?issue=%2F%2Fevil.example');
    await signInToFlow('/contribute/start/agent/own');
    expect(signIn).toHaveBeenLastCalledWith('github-basic', { redirectTo: '/contribute/start/agent/own' });
  });
});

describe('the way back in an address', () => {
  it('reads a well-formed mask id from any shape of query, and nothing else', () => {
    expect(flowWayBackOf('issue=q7k2m9xa&languages=go')).toBe('q7k2m9xa');
    expect(flowWayBackOf(new URLSearchParams('issue=q7k2m9xa'))).toBe('q7k2m9xa');
    expect(flowWayBackOf({ issue: ['q7k2m9xa', 'other'] })).toBe('q7k2m9xa');
    expect(flowWayBackOf({ issue: 'acme/widgets#4' })).toBeNull();
    expect(flowWayBackOf({})).toBeNull();
    expect(flowWayBackOf(null)).toBeNull();
  });

  it('keeps the rest of an address, and replaces an older way back', () => {
    expect(withFlowWayBack('/my/agent/key?replace=1#key', 'q7k2m9xa')).toBe(
      '/my/agent/key?replace=1&issue=q7k2m9xa#key',
    );
    expect(withFlowWayBack('/contribute/start?issue=old', 'q7k2m9xa')).toBe('/contribute/start?issue=q7k2m9xa');
    expect(withFlowWayBack('/contribute/start', null)).toBe('/contribute/start');
  });

  it('reads the browser’s address', () => {
    window.history.replaceState(null, '', '/contribute/start/issue?issue=q7k2m9xa');
    expect(flowWayBackHereOf()).toBe('q7k2m9xa');
  });
});
