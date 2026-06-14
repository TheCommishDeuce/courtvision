import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  clearStoredPortalKey,
  createPortalKey,
  fetchPortalKeys,
  fetchPortalMe,
  fetchPortalUsage,
  getStoredPortalKey,
  revokePortalKey,
  setStoredPortalKey,
  signupPortal,
  type CreatedPortalKey,
  type PortalKey,
  type PortalUser,
  type UsageRow,
} from '../api/portal-client';

type Tab = 'keys' | 'usage' | 'plan';

function ErrorLine({ value }: { value: string }) {
  return value ? (
    <div className="border-l-4 border-[var(--clay)] bg-[var(--bone-2)] px-3 py-2 text-sm text-[var(--clay-deep)]">
      {value}
    </div>
  ) : null;
}

function KeyBadge({ value }: { value: string }) {
  return <span className="ba-mono text-xs bg-[var(--bone-3)] px-2 py-1 text-[var(--ink-2)]">{value}</span>;
}

export default function DevPortalPage() {
  const [apiKey, setApiKey] = useState(getStoredPortalKey());
  const [user, setUser] = useState<PortalUser | null>(null);
  const [keys, setKeys] = useState<PortalKey[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('keys');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKeyName, setNewKeyName] = useState('automation');
  const [createdKey, setCreatedKey] = useState<CreatedPortalKey | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');

  const isAuthed = !!user;

  async function loadPortal() {
    if (!getStoredPortalKey()) return;
    setLoading(true);
    setError('');
    try {
      const [me, keyRows, usageRows] = await Promise.all([
        fetchPortalMe(),
        fetchPortalKeys(),
        fetchPortalUsage(30),
      ]);
      setUser(me);
      setKeys(keyRows);
      setUsage(usageRows);
    } catch {
      setUser(null);
      setKeys([]);
      setUsage([]);
      setError('The stored API key was not accepted.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPortal();
  }, []);

  async function handleUseKey(event: FormEvent) {
    event.preventDefault();
    setStoredPortalKey(apiKey);
    await loadPortal();
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setCreatedKey(null);
    try {
      const result = await signupPortal({
        email: signupEmail,
        name: signupName,
        key_name: 'default',
      });
      setStoredPortalKey(result.api_key.key);
      setApiKey(result.api_key.key);
      setCreatedKey(result.api_key);
      setUser(result.user);
      setKeys(await fetchPortalKeys());
      setUsage(await fetchPortalUsage(30));
      setActiveTab('keys');
    } catch {
      setError('Signup failed. The email may already be registered.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const key = await createPortalKey(newKeyName);
      setCreatedKey(key);
      setKeys(await fetchPortalKeys());
      setNewKeyName('automation');
    } catch {
      setError('Could not create an API key.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setLoading(true);
    setError('');
    try {
      await revokePortalKey(keyId);
      setKeys(await fetchPortalKeys());
    } catch {
      setError('Could not revoke that key.');
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearStoredPortalKey();
    setApiKey('');
    setUser(null);
    setKeys([]);
    setUsage([]);
    setCreatedKey(null);
  }

  const totalRequests = useMemo(
    () => usage.reduce((sum, row) => sum + row.requests, 0),
    [usage],
  );

  return (
    <div className="space-y-10">
      <section className="border-b border-[var(--rule)] pb-8">
        <div className="ba-kicker mb-4">Developer portal</div>
        <h1 className="ba-display">API Access</h1>
        <p className="mt-5 max-w-2xl text-[16px] text-[var(--ink-2)] leading-relaxed">
          Create and manage API keys for REST and MCP access.
        </p>
      </section>

      <ErrorLine value={error} />

      {!isAuthed ? (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleSignup} className="ba-card space-y-4">
            <div>
              <div className="ba-kicker mb-2">New account</div>
              <h2 className="ba-h2">Create free key</h2>
            </div>
            <label className="block">
              <span className="ba-kicker block mb-1">Name</span>
              <input className="ba-input w-full" value={signupName} onChange={e => setSignupName(e.target.value)} required />
            </label>
            <label className="block">
              <span className="ba-kicker block mb-1">Email</span>
              <input className="ba-input w-full" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
            </label>
            <button className="ba-btn ba-btn-primary" disabled={loading}>
              Create key
            </button>
          </form>

          <form onSubmit={handleUseKey} className="ba-card space-y-4">
            <div>
              <div className="ba-kicker mb-2">Existing account</div>
              <h2 className="ba-h2">Use API key</h2>
            </div>
            <label className="block">
              <span className="ba-kicker block mb-1">API key</span>
              <input
                className="ba-input w-full ba-mono"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="cv_..."
                required
              />
            </label>
            <button className="ba-btn ba-btn-ghost" disabled={loading}>
              Open portal
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="ba-card md:col-span-2">
              <div className="ba-kicker mb-2">Account</div>
              <div className="ba-stat-sm">{user.name}</div>
              <div className="text-sm text-[var(--ink-2)] mt-2">{user.email}</div>
            </div>
            <div className="ba-card">
              <div className="ba-kicker mb-2">Access tier</div>
              <div className="ba-stat-sm text-[var(--clay)]">{user.tier}</div>
            </div>
            <div className="ba-card">
              <div className="ba-kicker mb-2">30 days</div>
              <div className="ba-stat-sm">{totalRequests.toLocaleString()}</div>
            </div>
          </section>

          {createdKey && (
            <section className="ba-card border-t-[var(--clay)]">
              <div className="ba-kicker mb-2">New key</div>
              <p className="text-sm text-[var(--ink-2)] mb-3">This raw key is shown once.</p>
              <div className="ba-mono text-xs bg-[var(--ink)] text-[var(--bone)] p-3 overflow-x-auto">{createdKey.key}</div>
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-2 mb-5">
              <div className="flex gap-2 flex-wrap">
                {(['keys', 'usage', 'plan'] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    className={`ba-chip ${activeTab === tab ? 'ba-chip-active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button className="ba-btn ba-btn-ghost" onClick={signOut}>Forget key</button>
            </div>

            {activeTab === 'keys' && (
              <div className="space-y-5">
                <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
                  <input className="ba-input flex-1" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} required />
                  <button className="ba-btn ba-btn-primary" disabled={loading}>Create key</button>
                </form>
                <div className="overflow-x-auto">
                  <table className="ba-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Prefix</th>
                        <th>Status</th>
                        <th>Last used</th>
                        <th className="num">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map(key => (
                        <tr key={key.id}>
                          <td>{key.name}</td>
                          <td><KeyBadge value={key.key_prefix} /></td>
                          <td>{key.is_active ? 'active' : 'revoked'}</td>
                          <td>{key.last_used_at ? key.last_used_at.slice(0, 19) : 'never'}</td>
                          <td className="num">
                            {key.is_active ? (
                              <button className="ba-link text-xs" onClick={() => void handleRevoke(key.id)}>Revoke</button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="overflow-x-auto">
                <table className="ba-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Endpoint</th>
                      <th className="num">Requests</th>
                      <th className="num">Avg ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map(row => (
                      <tr key={`${row.day}-${row.endpoint}`}>
                        <td>{row.day}</td>
                        <td><span className="ba-mono text-xs">{row.endpoint}</span></td>
                        <td className="num">{row.requests.toLocaleString()}</td>
                        <td className="num">{row.avg_response_ms ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'plan' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  ['Self-serve', '60/min · 5,000/day', 'Current free public tier'],
                  ['Research', '300/min · 100,000/day', 'Admin-granted for trusted bulk usage'],
                  ['Dev', '3,000/min · 1,000,000/day', 'Local testing tier, not for shared keys'],
                ].map(([name, limit, note]) => (
                  <div key={name} className="ba-card">
                    <div className="ba-kicker mb-2">{limit}</div>
                    <div className="ba-stat-sm">{name}</div>
                    <p className="text-sm text-[var(--ink-2)] mt-3">{note}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
