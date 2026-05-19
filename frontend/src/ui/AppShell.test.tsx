import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('should render the brand logo "Mvp-CRM" in the header', () => {
    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    );

    const branding = screen.getByText(/mvp-crm/i);
    expect(branding).toBeInTheDocument();
  });

  it('should render the children in the main content area', () => {
    const testContent = 'Test Child Content';
    render(
      <AppShell>
        <div>{testContent}</div>
      </AppShell>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('should have a header with nav structure', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('should render with proper layout structure', () => {
    const { container } = render(
      <AppShell>
        <div data-testid="main-content">Content</div>
      </AppShell>
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
});
