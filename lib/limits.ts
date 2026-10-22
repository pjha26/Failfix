import { isIP } from 'node:net';

export class AnalysisGate {
  private active = 0;
  private total = 0;
  private clients = new Map<string, { count: number; until: number }>();
  acquire(client: string | null, now = Date.now()) {
    const configured = Number(process.env.ANALYSIS_SESSION_LIMIT || '100');
    const ceiling = Number.isSafeInteger(configured) && configured > 0 ? configured : 100;
    if (this.total >= ceiling) return { accepted: false as const, message: 'This demo has reached its analysis allowance. Please try the examples or run FailFix locally.' };
    if (this.active >= 2) return { accepted: false as const, message: 'Two analyses are already running. Please try again shortly.' };
    for (const [key, value] of this.clients) if (value.until <= now) this.clients.delete(key);
    if (client) {
      const value = this.clients.get(client);
      if (value && value.count >= 5) return { accepted: false as const, message: 'Please wait before analyzing again. Limit: five analyses per ten minutes.' };
      if (!value && this.clients.size >= 1000) return { accepted: false as const, message: 'The demo is busy. Please try again later.' };
      this.clients.set(client, { count: (value?.count || 0) + 1, until: value?.until || now + 10 * 60 * 1000 });
    }
    this.active++; this.total++;
    let released = false;
    return { accepted: true as const, release: () => { if (!released) { this.active--; released = true; } } };
  }
}

const state = globalThis as typeof globalThis & { failfixGate?: AnalysisGate };
export const gate = state.failfixGate ??= new AnalysisGate();

export function trustedClient(request: Request) {
  // shortcut: opt in only when the host overwrites this header; otherwise global limits apply.
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!header) return null;
  const candidate = request.headers.get(header)?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}
