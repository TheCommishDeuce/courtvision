import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QueryError from './QueryError';

describe('QueryError', () => {
  it('renders the message', () => {
    render(<QueryError message="API is down." />);
    expect(screen.getByText('API is down.')).toBeInTheDocument();
    expect(screen.getByText("Couldn't Load")).toBeInTheDocument();
  });

  it('fires the retry callback', () => {
    const onRetry = vi.fn();
    render(<QueryError onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('omits the retry button without a callback', () => {
    render(<QueryError />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
