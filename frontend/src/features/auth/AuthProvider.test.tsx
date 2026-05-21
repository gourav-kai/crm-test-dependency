import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AUTH_TOKEN_KEY, AuthProvider, useAuth } from './AuthProvider';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function Probe() {
  const { status, user } = useAuth();
  return (
    <div data-testid="auth-state">
      {status}-{user?.email ?? 'none'}
    </div>
  );
}

function wrap(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthProvider', () => {
  it('boots anon when no token exists', () => {
    render(wrap(<Probe />));

    expect(screen.getByTestId('auth-state')).toHaveTextContent('anon-none');
  });

  it('hydrates the user from an existing token', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'stored-token');
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          id: 2,
          email: 'rep@example.com',
          fullName: 'Sales Rep',
          role: 'sales',
          active: true,
        }),
      ),
    );

    render(wrap(<Probe />));

    await waitFor(() =>
      expect(screen.getByTestId('auth-state')).toHaveTextContent(
        'authed-rep@example.com',
      ),
    );
  });

  it('clears an invalid token when hydration returns 401', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'expired-token');
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Unauthorized',
            },
          },
          { status: 401 },
        ),
      ),
    );

    render(wrap(<Probe />));

    await waitFor(() =>
      expect(screen.getByTestId('auth-state')).toHaveTextContent('anon-none'),
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });
});
