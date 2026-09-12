import { beforeEach, describe, expect, it, vi } from 'vitest';
import showToast, { showToast as namedShowToast } from './notify.js';

describe('showToast', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches the toast event with defaults and custom values', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    showToast('Saved');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'kaizen:toast',
      detail: { message: 'Saved', type: 'success', duration: 2500 }
    }));

    namedShowToast('Failed', 'error', 1000);
    expect(dispatchSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      detail: { message: 'Failed', type: 'error', duration: 1000 }
    }));
  });
});
