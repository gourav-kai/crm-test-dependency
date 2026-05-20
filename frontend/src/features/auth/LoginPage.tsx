import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ApiError } from '@/api/client';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

import { useAuth } from './useAuth';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function getNext(search: string) {
  return new URLSearchParams(search).get('next') ?? '/';
}

export function LoginPage() {
  const { status, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = useMemo(() => getNext(location.search), [location.search]);

  if (status === 'authed') {
    return <Navigate to={next} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError('Enter a valid email and password.');
      return;
    }

    setPending(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate(next, { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setError('Too many attempts. Try again in 15 minutes.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Sign in to Mvp-CRM
        </h1>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Email</span>
            <input
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Password
            </span>
            <input
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
