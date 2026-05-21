import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

import { useHealth } from './api';

type PillState = 'loading' | 'ok' | 'down';

function StatusPill({ label, state }: { label: string; state: PillState }) {
  const color =
    state === 'ok'
      ? 'bg-green-100 text-green-800'
      : state === 'down'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-700';
  const text =
    state === 'ok' ? 'Connected' : state === 'down' ? 'Disconnected' : 'Checking…';
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${color}`}
      data-testid={`pill-${label.toLowerCase()}`}
    >
      <span className="font-semibold">{label}:</span> {text}
    </span>
  );
}

export function HomePage() {
  const { data, isError, isLoading, refetch } = useHealth();

  const backendState: PillState = isLoading ? 'loading' : isError ? 'down' : 'ok';
  const dbState: PillState = isLoading
    ? 'loading'
    : isError || data?.db !== 'ok'
      ? 'down'
      : 'ok';

  const showRetry = isError || data?.ok === false;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Mvp-CRM</h1>
      <Card className="flex flex-wrap gap-3 items-center">
        <StatusPill label="Backend" state={backendState} />
        <StatusPill label="Database" state={dbState} />
        {showRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            aria-label="Retry health check"
          >
            Retry
          </Button>
        )}
      </Card>
    </div>
  );
}
