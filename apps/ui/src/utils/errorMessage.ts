export function toUserMessage(err: unknown): string {
  if (!err) return 'حدث خطا غير متوقع';

  if (typeof err === 'string') return err;

  if (err instanceof Error) return err.message || 'حدث خطا غير متوقع';

  if (typeof err === 'object') {
    const anyErr = err as { message?: string; code?: string };
    if (anyErr.message) return anyErr.message;
    if (anyErr.code) return anyErr.code;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return 'حدث خطا غير متوقع';
  }
}
