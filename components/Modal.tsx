'use client';

import type { ReactNode } from 'react';

export default function Modal({
  open,
  title,
  onClose,
  children,
  size = 'max-w-xl',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#10271f]/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full ${size} overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-[#18352d]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full px-3 py-1 text-xl text-[#64766e] hover:bg-[#f1f4f0]"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
