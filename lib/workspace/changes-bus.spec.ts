import { afterEach, describe, expect, it, vi } from 'vitest';

import { changesPollRunning, clearChangesWake, setChangesWake } from './changes-bus';

describe('one poll in a tab', () => {
  const tabs = () => {};
  const live = () => {};
  afterEach(() => {
    clearChangesWake(tabs);
    clearChangesWake(live);
  });

  it("stops a poll that stood by when the tabs' poll starts", () => {
    const stop = vi.fn(() => clearChangesWake(live));
    setChangesWake(live, { stop });
    expect(changesPollRunning()).toBe(true);
    setChangesWake(tabs);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(changesPollRunning()).toBe(true);
    // Gone once: the tabs' poll stopping later stops nothing more.
    clearChangesWake(tabs);
    expect(changesPollRunning()).toBe(false);
    setChangesWake(tabs);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('forgets a poll that stood by once it stops by itself', () => {
    const stop = vi.fn();
    setChangesWake(live, { stop });
    clearChangesWake(live);
    setChangesWake(tabs);
    expect(stop).not.toHaveBeenCalled();
  });
});
