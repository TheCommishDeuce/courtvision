import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableSort } from './useTableSort';

interface Row { name: string; value: number | null }

const ROWS: Row[] = [
  { name: 'a', value: 5 },
  { name: 'b', value: null },
  { name: 'c', value: 10 },
];

describe('useTableSort', () => {
  it('sorts descending by default with nulls last', () => {
    const { result } = renderHook(() => useTableSort(ROWS, 'value'));
    expect(result.current.sorted.map(r => r.name)).toEqual(['c', 'a', 'b']);
  });

  it('toggling the active column flips direction (nulls still last)', () => {
    const { result } = renderHook(() => useTableSort(ROWS, 'value'));
    act(() => result.current.toggle('value'));
    expect(result.current.sortDir).toBe('asc');
    expect(result.current.sorted.map(r => r.name)).toEqual(['a', 'c', 'b']);
  });

  it('toggling a new column resets to descending', () => {
    const { result } = renderHook(() => useTableSort(ROWS, 'value'));
    act(() => result.current.toggle('name'));
    expect(result.current.sortKey).toBe('name');
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.sorted.map(r => r.name)).toEqual(['c', 'b', 'a']);
  });
});
