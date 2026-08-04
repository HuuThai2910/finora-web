const LOAN_BASE = import.meta.env.VITE_LOAN_API_URL ?? '/api/v1';

export async function loanFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${LOAN_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}
