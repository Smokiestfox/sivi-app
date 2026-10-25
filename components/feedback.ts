'use client';

export type ToastKind = 'success' | 'error' | 'info';

export function notify(message: string, kind: ToastKind = 'info') {
  window.dispatchEvent(new CustomEvent('sivi:toast', { detail: { message, kind } }));
}
