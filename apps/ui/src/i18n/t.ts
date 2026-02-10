import { ar } from './ar';

const FALLBACK_TEXT = 'نص غير مُعرّف';

function detectPermission(message: string): boolean {
  return /(unauthor|forbidden|permission|access|auth|لا توجد صلاحية)/i.test(message);
}

function detectInvalidData(message: string): boolean {
  return /(invalid|validation|required|must|format|payload|bad request|بيانات)/i.test(message);
}

function detectLoadFailure(message: string): boolean {
  return /(fetch|load|get|query|read|network|timeout|database|db|not found|failed)/i.test(message);
}

export function t(key: string): string {
  return ar[key] ?? ar['errors.undefinedText'] ?? FALLBACK_TEXT;
}

export function mapErrorToArabic(error: unknown, fallbackKey = 'errors.unexpected'): string {
  const fallback = t(fallbackKey);

  if (!error) {
    return fallback;
  }

  const rawMessage =
    typeof error === 'string'
      ? error
      : typeof error === 'object'
        ? String((error as { message?: unknown; error?: unknown }).message ?? (error as { error?: unknown }).error ?? '')
        : '';

  const message = rawMessage.trim();
  if (!message) {
    return fallback;
  }

  if (detectPermission(message)) {
    return t('errors.noPermission');
  }

  if (detectInvalidData(message)) {
    return t('errors.invalidData');
  }

  if (detectLoadFailure(message)) {
    return t('errors.loadFailed');
  }

  return fallback;
}

export function mapStatusToArabic(status: string | null | undefined): string {
  if (!status) return t('common.none');
  return t(`enum.saleStatus.${status}`) !== t('errors.undefinedText')
    ? t(`enum.saleStatus.${status}`)
    : t(`enum.productStatus.${status}`) !== t('errors.undefinedText')
      ? t(`enum.productStatus.${status}`)
      : t('common.none');
}

export function mapRoleToArabic(role: string | null | undefined): string {
  if (!role) return t('common.none');
  const value = t(`enum.role.${role}`);
  return value === t('errors.undefinedText') ? t('common.none') : value;
}
