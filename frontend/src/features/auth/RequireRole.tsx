import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/ui/Card';
import type { User } from '@/types';

import { useAuth } from './useAuth';

type RequireRoleProps = {
  role: User['role'];
  children: ReactNode;
};

export function RequireRole({ role, children }: RequireRoleProps) {
  const { user } = useAuth();

  if (user?.role !== role) {
    return (
      <Card>
        <h2 className="text-xl font-bold text-gray-900">403 - Forbidden</h2>
        <p className="mt-2 text-gray-600">
          You do not have access to this page.
        </p>
        <Link
          className="mt-4 inline-block font-medium text-blue-700 hover:underline"
          to="/"
        >
          Back to home
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}
