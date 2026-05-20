import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/features/auth/AuthProvider';

import { AppShell } from './AppShell';

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render the brand logo "Mvp-CRM" in the header', () => {
    renderWithProviders(
      <AppShell>
        <div>Test Content</div>
      </AppShell>,
    );

    const branding = screen.getByText(/mvp-crm/i);
    expect(branding).toBeInTheDocument();
  });

  it('should render the children in the main content area', () => {
    const testContent = 'Test Child Content';
    renderWithProviders(
      <AppShell>
        <div>{testContent}</div>
      </AppShell>,
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('should have a header with nav structure', () => {
    renderWithProviders(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('should render with proper layout structure', () => {
    const { container } = renderWithProviders(
      <AppShell>
        <div data-testid="main-content">Content</div>
      </AppShell>,
    );

    // Should have a header element
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    // Should have a main element for content
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();

    // Content should be inside main
    const mainContent = main?.querySelector('[data-testid="main-content"]');
    expect(mainContent).toBeInTheDocument();
  });

  it('should show a login link for anonymous users', () => {
    renderWithProviders(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});
