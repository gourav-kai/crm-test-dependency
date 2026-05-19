import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import { HomePage } from './HomePage';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('HomePage', () => {
  it('renders Connected pills when /api/health returns ok', async () => {
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json({ ok: true, backend: 'ok', db: 'ok' }),
      ),
    );
    render(wrap(<HomePage />));
    await waitFor(() =>
      expect(screen.getAllByText(/Connected/)).toHaveLength(2),
    );
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('shows Disconnected pills + Retry button on network error', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));
    render(wrap(<HomePage />));
    await waitFor(() =>
      expect(screen.getAllByText(/Disconnected/)).toHaveLength(2),
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows Disconnected on Database + Retry when backend reports db=down', async () => {
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json(
          { ok: false, backend: 'ok', db: 'down' },
          { status: 503 },
        ),
      ),
    );
    render(wrap(<HomePage />));
    // The api() client throws on 503, so both pills go red.
    await waitFor(() =>
      expect(screen.getAllByText(/Disconnected/)).toHaveLength(2),
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('refetches when Retry is clicked', async () => {
    let calls = 0;
    server.use(
      http.get('/api/health', () => {
        calls += 1;
        if (calls === 1) return HttpResponse.error();
        return HttpResponse.json({ ok: true, backend: 'ok', db: 'ok' });
      }),
    );
    render(wrap(<HomePage />));
    await waitFor(() =>
      expect(screen.getAllByText(/Disconnected/)).toHaveLength(2),
    );
    const retry = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retry);
    await waitFor(() =>
      expect(screen.getAllByText(/Connected/)).toHaveLength(2),
    );
  });

  it('renders the Mvp-CRM headline', () => {
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json({ ok: true, backend: 'ok', db: 'ok' }),
      ),
    );
    render(wrap(<HomePage />));
    expect(screen.getByRole('heading', { name: /Mvp-CRM/i })).toBeInTheDocument();
  });
});
