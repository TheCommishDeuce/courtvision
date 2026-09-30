import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, get } from '../../../api/http';
import labRaw from '../../../../../docs/design-brief/samples/lab.json?raw';
import { LocationProbe, memoryStorage } from '../../test/render';
import LabPage from './LabPage';

vi.mock('../../../api/http', () => ({ get: vi.fn(), api: { post: vi.fn() } }));

const LAB = JSON.parse(labRaw);
const resultFor = (sql: string) =>
  LAB.examples.find((e: { sql: string }) => e.sql.trim() === sql.trim())?.result
  ?? { columns: ['x'], rows: [[1]], row_count: 1, truncated: false, limit: 1000, elapsed_ms: 3 };

function mockApi({ fail = false } = {}) {
  vi.mocked(get).mockImplementation(async (path: string) => {
    if (path === '/query/schema') return LAB.schema.response;
    if (path === '/meta/stats') return { data_through: '2026-08-10' };
    throw new Error(`unexpected ${path}`);
  });
  vi.mocked(api.post).mockImplementation(async (_path: string, body?: unknown) => {
    if (fail) throw Object.assign(new Error('400'), { response: { status: 400, data: LAB.error_example.body } });
    return { data: resultFor((body as { sql: string }).sql) };
  });
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/lab" element={<><LabPage /><LocationProbe /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const editor = () => screen.getByLabelText('SQL') as HTMLTextAreaElement;

describe('LabPage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.mocked(get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it('loads and runs the default example, linking player names', async () => {
    mockApi();
    renderAt('/lab');
    expect(editor().value).toContain('loser_rank = 1');
    expect(await screen.findByText('89 rows')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Mirra Andreeva' })[0]).toHaveAttribute('href', '/player/mirra-andreeva');
    expect(screen.getByRole('button', { name: /teenagers have beaten/ })).toHaveAttribute('aria-pressed', 'true');
    // The default load doesn't write the URL.
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/lab$/);
  });

  it('opens an example from the URL and records picks in it', async () => {
    mockApi();
    renderAt('/lab?example=bagel-finals');
    expect(editor().value).toContain("'6-0'");
    await screen.findByText(/rows$/, { selector: 'strong' });
    fireEvent.click(screen.getByRole('button', { name: /most tiebreaks/ }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/lab?example=most-tiebreaks'));
  });

  it('runs custom SQL from the URL and with ⌘/Ctrl+Enter', async () => {
    mockApi();
    renderAt(`/lab?sql=${encodeURIComponent('SELECT 1 AS x')}`);
    expect(await screen.findByText('1 row')).toBeInTheDocument();
    fireEvent.change(editor(), { target: { value: 'SELECT 2 AS x' } });
    fireEvent.keyDown(editor(), { key: 'Enter', metaKey: true });
    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith('/query', { sql: 'SELECT 2 AS x', limit: undefined }));
    expect(screen.getByTestId('location')).toHaveTextContent('sql=SELECT+2+AS+x');
  });

  it('refuses non-SELECT statements before calling the server', async () => {
    mockApi();
    renderAt(`/lab?sql=${encodeURIComponent('SELECT 1 AS x')}`);
    await screen.findByText('1 row');
    vi.mocked(api.post).mockClear();
    fireEvent.change(editor(), { target: { value: 'DROP TABLE players' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByText('Only a single read-only SELECT or WITH query can run in the Lab.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows the database’s message verbatim', async () => {
    mockApi({ fail: true });
    renderAt(`/lab?sql=${encodeURIComponent('SELECT nope FROM matches_main')}`);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Binder Error: Referenced column "nope" not found');
  });

  it('writes SQL from the builder and inserts schema columns at the cursor', async () => {
    mockApi();
    renderAt('/lab');
    fireEvent.click(screen.getByText('Build a query'));
    fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Iga Swiatek' } });
    fireEvent.change(screen.getByLabelText('Tour'), { target: { value: 'F' } });
    fireEvent.click(screen.getByRole('button', { name: 'Write SQL ↓' }));
    expect(editor().value).toContain("player_name = 'Iga Swiatek'");
    expect(editor().value).toContain("tour = 'F'");

    fireEvent.change(editor(), { target: { value: 'SELECT  FROM players' } });
    editor().setSelectionRange(7, 7);
    const schema = await screen.findByRole('complementary', { name: 'Schema' });
    fireEvent.click(within(schema).getAllByRole('button', { name: /^Insert name:/ })[0]);
    expect(editor().value).toBe('SELECT name FROM players');
  });

  it('sorts results by a column', async () => {
    mockApi();
    renderAt('/lab?example=most-aces-match');
    await screen.findByText(/rows$/, { selector: 'strong' });
    const aces = screen.getByRole('columnheader', { name: /aces/ });
    fireEvent.click(within(aces).getByRole('button'));
    expect(aces).toHaveAttribute('aria-sort', 'descending');
  });
});
