import axios from 'axios';

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  tier: string;
  created_at: string;
}

export interface PortalKey {
  id: string;
  user_id?: string;
  key_prefix: string;
  name: string;
  is_active?: number | boolean;
  created_at: string;
  last_used_at?: string | null;
}

export interface CreatedPortalKey {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  key: string;
}

export interface UsageRow {
  day: string;
  endpoint: string;
  requests: number;
  avg_response_ms: number | null;
}

export interface SignupResponse {
  user: PortalUser;
  api_key: CreatedPortalKey;
}

const PORTAL_KEY_STORAGE = 'courtvision.portal.apiKey';

const portalApi = axios.create({ baseURL: '/api/portal' });

function normalizePortalKey(value: string): string {
  return value
    .trim()
    .replace(/^Authorization:\s*/i, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function authConfig() {
  const token = getStoredPortalKey();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

export function getStoredPortalKey(): string {
  return localStorage.getItem(PORTAL_KEY_STORAGE) ?? '';
}

export function setStoredPortalKey(key: string): void {
  const trimmed = normalizePortalKey(key);
  if (trimmed) {
    localStorage.setItem(PORTAL_KEY_STORAGE, trimmed);
  }
}

export function clearStoredPortalKey(): void {
  localStorage.removeItem(PORTAL_KEY_STORAGE);
}

export const signupPortal = (payload: {
  email: string;
  name: string;
  key_name?: string;
}): Promise<SignupResponse> =>
  portalApi.post<SignupResponse>('/signup', payload).then(r => r.data);

export const fetchPortalMe = (): Promise<PortalUser> =>
  portalApi.get<PortalUser>('/me', authConfig()).then(r => r.data);

export const fetchPortalKeys = (): Promise<PortalKey[]> =>
  portalApi.get<{ keys: PortalKey[] }>('/keys', authConfig()).then(r => r.data.keys);

export const createPortalKey = (name: string): Promise<CreatedPortalKey> =>
  portalApi.post<CreatedPortalKey>('/keys', { name }, authConfig()).then(r => r.data);

export const revokePortalKey = (keyId: string): Promise<void> =>
  portalApi.delete(`/keys/${keyId}`, authConfig()).then(() => undefined);

export const fetchPortalUsage = (days = 30): Promise<UsageRow[]> =>
  portalApi.get<{ usage: UsageRow[] }>('/usage', { ...authConfig(), params: { days } }).then(r => r.data.usage);
