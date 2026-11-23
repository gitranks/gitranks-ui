// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, startLearnSetupGuessAction } = vi.hoisted(() => ({
  hint: { present: true },
  startLearnSetupGuessAction: vi.fn(),
}));
vi.mock('./setup.actions', () => ({ startLearnSetupGuessAction }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { forgetLearnSetupGuessStart, startLearnSetupGuessOnce, useLearnSetupGuess } = await import('./use-setup-guess');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  startLearnSetupGuessAction.mockReset();
  startLearnSetupGuessAction.mockResolvedValue({ ok: true, data: 'WORKING' });
  forgetLearnSetupGuessStart();
  hint.present = true;
});

describe('starting our guess of the setup', () => {
  it('asks once per page load, however many parts of the page ask', async () => {
    const [first, second] = await Promise.all([startLearnSetupGuessOnce(), startLearnSetupGuessOnce()]);
    await startLearnSetupGuessOnce();
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ ok: true, data: 'WORKING' });
    expect(second).toBe(first);
  });

  it('lets a later page try again when the start failed', async () => {
    startLearnSetupGuessAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    expect(await startLearnSetupGuessOnce()).toEqual({ ok: false, error: 'FAILED' });
    expect(await startLearnSetupGuessOnce()).toEqual({ ok: true, data: 'WORKING' });
    await startLearnSetupGuessOnce();
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(2);
  });

  it('never throws, and tries again after a start that threw', async () => {
    startLearnSetupGuessAction.mockRejectedValueOnce(new Error('offline'));
    await expect(startLearnSetupGuessOnce()).resolves.toBeNull();
    await startLearnSetupGuessOnce();
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(2);
  });
});

describe('a Learn page starting our guess', () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  function Part({ name }: { name: string }) {
    useLearnSetupGuess();
    return <p>{name}</p>;
  }

  const draw = () =>
    act(async () => {
      root.render(
        <>
          <Part name="the lesson" />
          <Part name="its question" />
        </>,
      );
    });

  it('asks nothing for a visitor', async () => {
    hint.present = false;
    await draw();
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
  });

  it('starts it once for a person with a session, and draws the page without waiting for it', async () => {
    startLearnSetupGuessAction.mockImplementation(() => new Promise(() => {}));
    await draw();
    expect(host.textContent).toBe('the lessonits question');
    await draw();
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
  });
});
