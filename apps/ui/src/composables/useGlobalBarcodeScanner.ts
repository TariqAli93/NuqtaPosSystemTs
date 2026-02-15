import { ref, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

export type ScannerMode = 'pos' | 'product';

export interface ScannerOptions {
  mode: ScannerMode;
  onScan: (barcode: string) => void;
  minLength?: number;
  maxInterKeyMs?: number;
  idleTimeoutMs?: number;
}

export function useGlobalBarcodeScanner(options: ScannerOptions) {
  const { mode, onScan, minLength = 4, maxInterKeyMs = 35, idleTimeoutMs = 180 } = options;

  const route = useRoute();
  const buffer = ref('');
  const lastKeyTime = ref(0);
  const idleTimer = ref<number | null>(null);
  const isActive = ref(false);
  const isScanning = ref(false);

  function shouldIgnoreEvent(event: KeyboardEvent): boolean {
    // Ignore modifier keys
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return true;
    }

    // Ignore function keys
    if (event.key.startsWith('F') && event.key.length > 1) {
      return true;
    }

    // Ignore special keys
    const specialKeys = [
      'Shift',
      'Control',
      'Alt',
      'Meta',
      'CapsLock',
      'Tab',
      'Escape',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Insert',
      'Delete',
      'Backspace',
    ];
    if (specialKeys.includes(event.key)) {
      return true;
    }

    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();

    // In product mode, allow scanning even if barcode field is focused
    if (mode === 'product') {
      // Check if this is the barcode field
      const isBarcodeField =
        target.id === 'barcode-field' ||
        target.getAttribute('name') === 'barcode' ||
        target.closest('[data-barcode-field]') !== null;

      if (isBarcodeField) {
        return false; // Allow scanning into barcode field
      }
    }

    // Ignore typing in input/textarea/contenteditable
    if (['input', 'textarea'].includes(tagName) || target.isContentEditable) {
      return true;
    }

    return false;
  }

  function finalizeScan() {
    if (isScanning.value) {
      return; // Prevent double finalization
    }

    const scannedBarcode = buffer.value.trim();

    if (scannedBarcode.length >= minLength) {
      isScanning.value = true;
      onScan(scannedBarcode);

      // Reset after a short delay to prevent double-add
      setTimeout(() => {
        isScanning.value = false;
      }, 100);
    }

    reset();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isActive.value) return;
    if (shouldIgnoreEvent(event)) return;

    const key = event.key;

    // Handle Enter key - finalize scan
    if (key === 'Enter') {
      event.preventDefault();
      finalizeScan();
      return;
    }

    // Only accept printable characters
    if (key.length !== 1) {
      return;
    }

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime.value;

    // Detect scanner burst (fast typing)
    if (lastKeyTime.value === 0 || timeSinceLastKey <= maxInterKeyMs) {
      // Part of scan burst
      buffer.value += key;
    } else {
      // New scan or manual typing (too slow)
      buffer.value = key;
    }

    lastKeyTime.value = now;

    // Clear existing idle timer
    if (idleTimer.value !== null) {
      clearTimeout(idleTimer.value);
    }

    // Set new idle timer - auto-finalize after idle period
    idleTimer.value = window.setTimeout(() => {
      finalizeScan();
    }, idleTimeoutMs);
  }

  function reset() {
    buffer.value = '';
    lastKeyTime.value = 0;
    if (idleTimer.value !== null) {
      clearTimeout(idleTimer.value);
      idleTimer.value = null;
    }
  }

  function start() {
    if (isActive.value) return;

    // Only start if route has matching enableBarcode meta
    if (route.meta.enableBarcode !== mode) {
      return;
    }

    isActive.value = true;
    reset();
    window.addEventListener('keydown', handleKeyDown, true);
  }

  function stop() {
    if (!isActive.value) return;

    isActive.value = false;
    reset();
    window.removeEventListener('keydown', handleKeyDown, true);
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    stop();
  });

  return {
    start,
    stop,
    reset,
    isActive,
  };
}
