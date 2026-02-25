import { pinia } from '@/app/pinia';
import { useNotificationStore, type ToastOptions } from '@/stores/notificationStore';

export function notifySuccess(message: string, options?: ToastOptions): string {
  return useNotificationStore(pinia).success(message, options);
}

export function notifyError(message: string, options?: ToastOptions): string {
  return useNotificationStore(pinia).error(message, options);
}

export function notifyInfo(message: string, options?: ToastOptions): string {
  return useNotificationStore(pinia).info(message, options);
}

export function notifyWarn(message: string, options?: ToastOptions): string {
  return useNotificationStore(pinia).warn(message, options);
}
