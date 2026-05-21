import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './useAuth';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">
        <div aria-label="Loading authentication" role="status">
          Loading...
        </div>
      </div>
    );
  }

  if (status === 'anon') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate replace to={`/login?next=${next}`} />;
  }

  return <Outlet />;
}
