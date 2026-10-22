import { afterEach, expect, it, vi } from 'vitest';
import { AnalysisGate, trustedClient } from '../lib/limits';
afterEach(() => vi.unstubAllEnvs());
it('bounds concurrency and releases a slot only once', () => {
  const gate = new AnalysisGate();
  const first = gate.acquire(null);
  const second = gate.acquire(null);
  expect(gate.acquire(null).accepted).toBe(false);
  if (first.accepted) {
    first.release();
    first.release();
  }
  expect(gate.acquire(null).accepted).toBe(true);
  expect(gate.acquire(null).accepted).toBe(false);
  if (second.accepted) second.release();
});
it('limits a trusted client and expires the window', () => {
  const gate = new AnalysisGate();
  for (let i = 0; i < 5; i++) {
    const slot = gate.acquire('127.0.0.1', 100);
    if (slot.accepted) slot.release();
  }
  expect(gate.acquire('127.0.0.1', 101).accepted).toBe(false);
  expect(gate.acquire('127.0.0.1', 600101).accepted).toBe(true);
});
it('enforces a global lifetime allowance', () => {
  vi.stubEnv('ANALYSIS_SESSION_LIMIT', '1');
  const gate = new AnalysisGate();
  const slot = gate.acquire(null);
  if (slot.accepted) slot.release();
  expect(gate.acquire(null).accepted).toBe(false);
});
it('ignores forwarded addresses unless the operator configured a trusted header', () => {
  vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
  const request = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '1.2.3.4' },
  });
  expect(trustedClient(request)).toBeNull();
  vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'x-forwarded-for');
  expect(trustedClient(request)).toBe('1.2.3.4');
  expect(
    trustedClient(
      new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 9.8.7.6' },
      }),
    ),
  ).toBeNull();
});
