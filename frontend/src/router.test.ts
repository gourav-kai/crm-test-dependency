import { describe, it, expect } from 'vitest';
import { router } from './router';

describe('router', () => {
  it('should have a root route', () => {
    expect(router).toBeDefined();
    expect(router.routes).toBeDefined();
    expect(router.routes.length).toBeGreaterThan(0);
  });

  it('should have route for path /', () => {
    const rootRoute = router.routes[0];
    expect(rootRoute.path).toBe('/');
  });

  it('should have element for root route', () => {
    const rootRoute = router.routes[0];
    expect(rootRoute).toBeDefined();
  });
});
