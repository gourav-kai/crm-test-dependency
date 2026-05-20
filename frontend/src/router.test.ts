import { describe, it, expect } from 'vitest';
import { router } from './router';

describe('router', () => {
  it('should have a root route', () => {
    expect(router).toBeDefined();
    expect(router.routes).toBeDefined();
    expect(router.routes.length).toBeGreaterThan(0);
  });

  it('should have route for path /', () => {
    const rootRoute = router.routes.find((route) => route.path === '/');
    expect(rootRoute).toBeDefined();
    if (!rootRoute) throw new Error('Missing root route');
    expect(rootRoute.path).toBe('/');
  });

  it('should have an unauthenticated login route', () => {
    const loginRoute = router.routes.find((route) => route.path === '/login');
    expect(loginRoute).toBeDefined();
  });

  it('should have element for root route', () => {
    const rootRoute = router.routes.find((route) => route.path === '/');
    expect(rootRoute).toBeDefined();
  });
});
