import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Filters } from '../lib/filters';
import { renderAt } from '../test/render';
import FilterBar from './FilterBar';

const value: Filters = { tour: 'F', surface: 'All', level: 'All', from: null, to: null };
const base = { value, onReset: () => undefined, summary: 'Whole career', yearMin: 2015, yearMax: 2026 };

function setWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  window.dispatchEvent(new Event('resize'));
}

describe('FilterBar', () => {
  afterEach(() => setWidth(1024));

  it('reports changes as patches and treats the range ends as open', () => {
    const onChange = vi.fn();
    renderAt(<FilterBar {...base} onChange={onChange} active={0} />);
    fireEvent.click(screen.getByRole('button', { name: /Clay/ }));
    expect(onChange).toHaveBeenLastCalledWith({ surface: 'Clay' });

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2020' } });
    expect(onChange).toHaveBeenLastCalledWith({ from: 2020 });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026' } });
    expect(onChange).toHaveBeenLastCalledWith({ to: null });
  });

  it('lists the tour’s own levels', () => {
    renderAt(<FilterBar {...base} onChange={() => undefined} active={0} />);
    const options = [...(screen.getByLabelText('Level') as HTMLSelectElement).options].map(o => o.text);
    expect(options).toContain('WTA 1000');
    expect(options).not.toContain('ATP 250 / 500');
  });

  it('shows Reset only when something is active, and the tour toggle only on request', () => {
    const { unmount } = renderAt(<FilterBar {...base} onChange={() => undefined} active={0} />);
    expect(screen.queryByText('Reset filters')).toBeNull();
    expect(screen.queryByRole('button', { name: 'ATP' })).toBeNull();
    unmount();

    const onReset = vi.fn();
    renderAt(<FilterBar {...base} onChange={() => undefined} onReset={onReset} active={2} showTour />);
    fireEvent.click(screen.getByText('Reset filters'));
    expect(onReset).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'WTA' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('collapses behind one button on phones', () => {
    setWidth(390);
    renderAt(<FilterBar {...base} onChange={() => undefined} active={2} showTour summary="Clay · 2023–2026" />);
    const toggle = screen.getByRole('button', { name: 'Filters (2)' });
    expect(screen.queryByLabelText('Level')).toBeNull();
    expect(screen.getByText('Clay · 2023–2026')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Level')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ATP' })).toBeInTheDocument();
    expect(screen.getByText('Reset filters')).toBeInTheDocument();
  });
});
