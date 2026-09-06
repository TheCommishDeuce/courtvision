import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUrlFilters } from './useUrlFilters';
import { playerFilterSchema, defaultPlayerFilters } from '../components/sections/player/filters';
import { recordsFilterSchema, defaultRecordsFilters } from '../components/sections/records/filters';

function wrapperAt(url: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
}

function usePlayerFilters() {
  const [filters, setFilters] = useUrlFilters(playerFilterSchema, defaultPlayerFilters);
  return { filters, setFilters, location: useLocation(), navigate: useNavigate(), navigationType: useNavigationType() };
}

describe('useUrlFilters', () => {
  it('uses defaults for missing fields without dropping a deep-linked player', () => {
    const { result } = renderHook(usePlayerFilters, { wrapper: wrapperAt('/player?p=Serena+Williams') });
    expect(result.current.filters).toEqual({ ...defaultPlayerFilters, p: 'Serena Williams' });
  });

  it('preserves the existing last-value-wins behavior for repeated URL keys', () => {
    const { result } = renderHook(usePlayerFilters, { wrapper: wrapperAt('/player?tour=M&tour=F') });
    expect(result.current.filters.tour).toBe('F');
  });

  it('falls back only for the invalid year, preserving the player, tour, and other filters', () => {
    const { result } = renderHook(usePlayerFilters, {
      wrapper: wrapperAt('/player?p=Serena+Williams&tour=F&surface=Clay&y0=oops&y1=2022'),
    });
    expect(result.current.filters).toEqual({
      ...defaultPlayerFilters, p: 'Serena Williams', tour: 'F', surface: 'Clay', y1: 2022,
    });
  });

  it('falls back for an invalid enum without discarding valid records filters', () => {
    const { result } = renderHook(() => useUrlFilters(recordsFilterSchema, defaultRecordsFilters), {
      wrapper: wrapperAt('/records?tab=invalid&tour=F&board=aces&y0=2024&y1=2025'),
    });
    expect(result.current[0]).toEqual({
      ...defaultRecordsFilters, tour: 'F', board: 'aces', y0: 2024, y1: 2025,
    });
  });

  it('patches the recovered state and preserves unrelated URL parameters', () => {
    const { result } = renderHook(usePlayerFilters, {
      wrapper: wrapperAt('/player?p=Serena+Williams&tour=F&y0=oops&campaign=shared'),
    });
    act(() => result.current.setFilters({ surface: 'Grass' }));
    expect(result.current.filters).toEqual({
      ...defaultPlayerFilters, p: 'Serena Williams', tour: 'F', surface: 'Grass',
    });
    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('p')).toBe('Serena Williams');
    expect(params.get('campaign')).toBe('shared');
    expect(params.has('y0')).toBe(false);
    expect(result.current.navigationType).toBe('REPLACE');
  });

  it('removes cleared filters from the URL and round-trips numeric values', () => {
    const { result } = renderHook(usePlayerFilters, {
      wrapper: wrapperAt('/player?p=Serena+Williams&tour=F&y0=2020'),
    });
    act(() => result.current.setFilters({ p: '', y0: undefined, y1: 2022 }));
    const params = new URLSearchParams(result.current.location.search);
    expect(params.has('p')).toBe(false);
    expect(params.has('y0')).toBe(false);
    expect(params.get('y1')).toBe('2022');
    expect(result.current.filters.y1).toBe(2022);
    expect(result.current.filters.tour).toBe('F');
  });

  it('reads navigation changes rather than retaining the first URL state', () => {
    const { result } = renderHook(usePlayerFilters, { wrapper: wrapperAt('/player?p=Serena+Williams&tour=F') });
    act(() => result.current.navigate('/player?p=Roger+Federer&tour=M&y0=bad'));
    expect(result.current.filters).toEqual({ ...defaultPlayerFilters, p: 'Roger Federer' });
  });
});
