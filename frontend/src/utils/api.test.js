import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestUse = vi.fn();
const responseUse = vi.fn();
const apiMock = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: requestUse },
    response: { use: responseUse }
  }
};

vi.mock('axios', () => ({
  default: { create: vi.fn(() => apiMock) }
}));

const apiModule = await import('./api.js');

describe('API clients', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('configures interceptors and production write state', () => {
    expect(requestUse).toHaveBeenCalled();
    expect(responseUse).toHaveBeenCalled();
    expect(apiModule.areProductionWritesEnabled()).toBe(false);
    apiModule.setProductionWritesEnabled(true);
    expect(apiModule.areProductionWritesEnabled()).toBe(false);
  });

  it('exposes auth, contest, jury, team, assignment, evaluation and state methods', () => {
    const methods = [
      ['login', ['u', 'p', 'admin'], '/auth/login'],
      ['verify', ['token'], '/auth/verify'],
      ['changePassword', [{ password: 'new' }], '/auth/change-password'],
      ['logout', [], '/auth/logout'],
      ['logoutAll', [], '/auth/logout-all'],
      ['getAll', [], '/contests'],
      ['create', [{ name: 'Contest' }], '/contests'],
      ['update', ['id', {}], '/contests/id'],
      ['delete', ['id'], '/contests/id'],
      ['setScoreUpdates', ['id', true], '/contests/id/score-updates'],
      ['complete', ['id'], '/contests/id/complete'],
      ['publish', ['id'], '/contests/id/publish'],
      ['unpublish', ['id'], '/contests/id/unpublish']
    ];

    methods.forEach(([method, args]) => {
      const group = method === 'login' || method === 'verify' || method === 'changePassword' || method === 'logout' || method === 'logoutAll'
        ? apiModule.authAPI
        : apiModule.contestsAPI;
      group[method](...args);
    });

    apiModule.juriesAPI.getAll();
    apiModule.juriesAPI.create({});
    apiModule.juriesAPI.update('id', {});
    apiModule.juriesAPI.delete('id');
    apiModule.teamsAPI.getAll();
    apiModule.teamsAPI.create({});
    apiModule.teamsAPI.bulkCreate([]);
    apiModule.teamsAPI.update('id', {});
    apiModule.teamsAPI.delete('id');
    apiModule.assignmentsAPI.getAll();
    apiModule.assignmentsAPI.create({});
    apiModule.assignmentsAPI.update('id', {});
    apiModule.assignmentsAPI.delete('id');
    apiModule.evaluationsAPI.getAll();
    apiModule.evaluationsAPI.submit({});
    apiModule.stateAPI.getSnapshot();
    apiModule.stateAPI.setActiveContest('id');

    expect(apiMock.post).toHaveBeenCalled();
    expect(apiMock.get).toHaveBeenCalled();
    expect(apiMock.put).toHaveBeenCalled();
    expect(apiMock.delete).toHaveBeenCalled();
  });

  it('adds the auth token in the request interceptor', () => {
    localStorage.setItem('token', 'abc');
    const requestInterceptor = requestUse.mock.calls[0][0];
    const config = { headers: {} };
    expect(requestInterceptor(config).headers.Authorization).toBe('Bearer abc');
  });

  it('returns request configs without optional headers and preserves responses/errors', async () => {
    const requestInterceptor = requestUse.mock.calls[0][0];
    expect(requestInterceptor({ headers: {} })).toEqual({ headers: {} });

    const [successInterceptor, errorInterceptor] = responseUse.mock.calls[0];
    const response = { data: true };
    expect(successInterceptor(response)).toBe(response);
    await expect(errorInterceptor({ config: { url: '/auth/login' }, response: { status: 401 } }))
      .rejects.toEqual({ config: { url: '/auth/login' }, response: { status: 401 } });
  });

  it('enables production write confirmation when the production mode is configured', async () => {
    vi.stubEnv('VITE_PRODUCTION_DATA_MODE', 'true');
    vi.stubEnv('VITE_PRODUCTION_WRITE_KEY', 'write-key');
    vi.resetModules();
    const productionApi = await import('./api.js');
    productionApi.setProductionWritesEnabled(true);
    expect(productionApi.areProductionWritesEnabled()).toBe(true);
    const requestInterceptor = requestUse.mock.calls.at(-1)[0];
    expect(requestInterceptor({ headers: {} }).headers['X-Production-Write-Confirmation']).toBe('write-key');
    vi.unstubAllEnvs();
  });

  it('clears the session for unauthorized non-login responses', async () => {
    const [, errorInterceptor] = responseUse.mock.calls[0];
    localStorage.setItem('token', 'abc');
    localStorage.setItem('user', 'user');
    const location = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } });
    await expect(errorInterceptor({ config: { url: '/teams' }, response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/');
    Object.defineProperty(window, 'location', { configurable: true, value: location });
  });
});
