import { contextBridge, ipcRenderer } from 'electron';
import { RENDERER_IPC_CHANNELS } from '../ipc/channels.js';

/**
 * Explicit allowlist of valid IPC channels.
 * Only these channels are permitted; all others are rejected.
 */
const ALLOWED_CHANNELS = new Set<string>(RENDERER_IPC_CHANNELS as readonly string[]);

const safeInvoke = (channel: string, data?: unknown) => {
  if (!ALLOWED_CHANNELS.has(channel)) {
    throw new Error(`Invalid IPC channel: "${channel}" is not permitted`);
  }

  return ipcRenderer.invoke(channel, data);
};

contextBridge.exposeInMainWorld('electron', {
  invoke: safeInvoke,
});

contextBridge.exposeInMainWorld('electronAPI', {
  getPrinters: () => safeInvoke('printers:getAll'),
});
