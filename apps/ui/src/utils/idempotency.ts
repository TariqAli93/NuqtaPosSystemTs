/**
 * Generates a unique idempotency key that can be sent with write operations
 * to prevent accidental duplicates on retry / double-click.
 *
 * Format: `{action}:{timestamp}:{random}`
 */
export function generateIdempotencyKey(action: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `${action}:${ts}:${rand}`;
}
