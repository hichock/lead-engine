// Small fetch helper for source modules: a timeout, JSON parsing, and an error that names the provider and status.
export async function getJson<T>(provider: string, url: string, init: RequestInit = {}, timeoutMs = 50_000): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T;
}
