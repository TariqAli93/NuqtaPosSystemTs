type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export function handleError(error: any): void {
  if (!error) return;

  const isUnauthorized =
    error.code === 'UNAUTHORIZED' ||
    error.code === 'AUTH_ERROR' ||
    error.message?.includes('unauthorized') ||
    error.message?.includes('authentication');

  if (isUnauthorized && unauthorizedHandler) {
    unauthorizedHandler();
  }
}
