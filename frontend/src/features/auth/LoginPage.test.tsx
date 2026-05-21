import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AUTH_TOKEN_KEY, AuthProvider } from './AuthProvider';
import { LoginPage } from './LoginPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function CurrentLocation() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderWithAuth(ui: ReactNode, initialEntries = ['/login']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={ui} path="/login" />
            <Route element={<CurrentLocation />} path="/" />
            <Route element={<CurrentLocation />} path="/leads" />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('logs in and redirects to the next route', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          token: 'new-token',
          user: {
            id: 1,
            email: 'admin@example.com',
            fullName: 'Admin User',
            role: 'admin',
            active: true,
          },
        }),
      ),
    );

    renderWithAuth(<LoginPage />, ['/login?next=%2Fleads']);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/leads'),
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('new-token');
  });

  it('shows a generic message on 401', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid credentials',
            },
          },
          { status: 401 },
        ),
      ),
    );

    renderWithAuth(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Invalid email or password');
  });

  it('shows the rate-limit message on 429', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests',
            },
          },
          { status: 429 },
        ),
      ),
    );

    renderWithAuth(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in 15 minutes.',
    );
  });
});
