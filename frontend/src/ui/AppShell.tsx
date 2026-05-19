import { ReactNode } from 'react';

interface AppShellProps {
  children?: ReactNode;
}

/**
 * AppShell — top-level layout wrapper with header nav and main content area
 *
 * Renders:
 * - Header with brand logo and navigation placeholder
 * - Main content area for children
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Mvp-CRM</h1>
          </div>

          {/* Navigation placeholder (future menu items) */}
          <div className="flex items-center space-x-4">
            {/* User slot placeholder — will be populated by auth context */}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
