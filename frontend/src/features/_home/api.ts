import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';

export type HealthBody =
  | { ok: true; backend: 'ok'; db: 'ok' }
  | { ok: false; backend: 'ok'; db: 'down' };

export function useHealth() {
  return useQuery({
    queryKey: ['health'] as const,
    queryFn: () => api<HealthBody>('/api/health'),
    retry: 0,
  });
}
