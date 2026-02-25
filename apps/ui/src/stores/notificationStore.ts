import { defineStore } from 'pinia';
import { toast } from 'vue-toastflow';

export type ToastType = 'success' | 'error' | 'info' | 'warn';

export type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center';

export interface ToastOptions {
  title?: string;
  timeout?: number;
  persistent?: boolean;
  actionText?: string;
  onAction?: () => void;
  dedupeKey?: string;
  dedupeWindowMs?: number;
  position?: ToastPosition;
}

const DEFAULT_TIMEOUT = 3000;
const DEFAULT_DEDUPE_WINDOW = 3000;

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    defaultPosition: 'top-center',
  }),
  actions: {
    showMessage(message: string, type: ToastType, opts: ToastOptions = {}): string {
      const now = Date.now();
      const dedupeKey = opts.dedupeKey ?? message;
      const dedupeWindowMs = opts.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW;

      const lastShown = dedupeRegistry.get(dedupeKey);
      if (lastShown && now - lastShown.timestamp < dedupeWindowMs) {
        return lastShown.id;
      }

      if (opts.persistent) {
        opts.timeout = 0; // Infinity/0 depending on library, 0 disables it for custom logic, or we use duration: false
      }

      const id = `toast_${now}_${Math.random().toString(36).slice(2, 8)}`;
      let duration = opts.timeout !== undefined ? opts.timeout : DEFAULT_TIMEOUT;
      if (opts.persistent || duration <= 0) {
        duration = 0; // Assumes 0 means persistent in vue-toastflow setup
      }

      const actionButton = opts.actionText
        ? [
            {
              label: opts.actionText,
              onClick: () => {
                if (opts.onAction) opts.onAction();
                toast.dismiss(id);
              },
            },
          ]
        : [];

      let tfType: 'success' | 'error' | 'info' | 'warning' = 'info';
      if (type === 'success') tfType = 'success';
      if (type === 'error') tfType = 'error';
      if (type === 'warn') tfType = 'warning';

      // Use try/catch because if store initialized before vue-toastflow, it might fail.
      try {
        toast[tfType]({
          id,
          title: opts.title,
          description: message,
          duration: opts.persistent ? 0 : duration,
          position: opts.position ?? this.defaultPosition,
          buttons: actionButton.length > 0 ? { buttons: actionButton } : undefined,
        } as any);
      } catch (err) {
        console.error('Failed to show toast via vue-toastflow', err);
      }

      dedupeRegistry.set(dedupeKey, { id, timestamp: now });

      return id;
    },
    success(message: string, opts?: ToastOptions): string {
      return this.showMessage(message, 'success', opts);
    },
    error(message: string, opts?: ToastOptions): string {
      return this.showMessage(message, 'error', opts);
    },
    info(message: string, opts?: ToastOptions): string {
      return this.showMessage(message, 'info', opts);
    },
    warn(message: string, opts?: ToastOptions): string {
      return this.showMessage(message, 'warn', opts);
    },
    remove(id: string): void {
      try {
        toast.dismiss(id);
      } catch {}
    },
    clear(): void {
      try {
        toast.dismissAll();
      } catch {}
    },
    setPosition(position: ToastPosition): void {
      this.defaultPosition = position;
    },
  },
});

const dedupeRegistry = new Map<string, { id: string; timestamp: number }>();
