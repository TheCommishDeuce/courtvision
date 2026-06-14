import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createQueryHook, STALE } from './createQueryHook';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('createQueryHook', () => {
  it('resolves data from the fetcher', async () => {
    const fetcher = vi.fn((params: { id: number }) => Promise.resolve({ value: params.id * 2 }));
    const useThing = createQueryHook('thing', fetcher);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useThing({ id: 21 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ value: 42 });
    expect(fetcher).toHaveBeenCalledWith({ id: 21 });
  });

  it('never calls the fetcher when enabled is false', async () => {
    const fetcher = vi.fn(() => Promise.resolve('data'));
    const useThing = createQueryHook('thing', fetcher);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useThing(undefined, false), { wrapper });

    await new Promise(r => setTimeout(r, 20));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stores the result under [prefix, params] in the cache', async () => {
    const params = { player: 'Sinner', tour: 'M' };
    const fetcher = vi.fn(() => Promise.resolve(['row']));
    const useThing = createQueryHook('playerMatches', fetcher);
    const { client, wrapper } = makeWrapper();

    const { result } = renderHook(() => useThing(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(['playerMatches', params])).toEqual(['row']);
  });

  it('exports the shared 5-minute STALE constant', () => {
    expect(STALE).toBe(5 * 60 * 1000);
  });
});
