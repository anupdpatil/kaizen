import { beforeEach, describe, expect, it, vi } from 'vitest';

const renderMock = vi.fn();
const createRoot = vi.fn(() => ({ render: renderMock }));

vi.mock('react-dom/client', () => ({ default: { createRoot } }));
vi.mock('./App.jsx', () => ({ default: () => null }));

describe('application entry point', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.resetModules();
    createRoot.mockClear();
    renderMock.mockClear();
  });

  it('mounts the application at the root element', async () => {
    await import('./main.jsx');
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderMock).toHaveBeenCalled();
  });
});
