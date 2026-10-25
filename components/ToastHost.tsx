'use client';

import { useEffect, useRef, useState } from 'react';
import type { ToastKind } from '@/components/feedback';

interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

export default function ToastHost() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      const id = ++nextId.current;
      setMessages((current) => [...current, { id, ...detail }]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== id));
      }, 4500);
    };
    window.addEventListener('sivi:toast', receive);
    return () => window.removeEventListener('sivi:toast', receive);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {messages.map((message) => (
        <div
          key={message.id}
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            message.kind === 'error' ? 'bg-red-700' : message.kind === 'success' ? 'bg-[#187b5b]' : 'bg-[#365c4e]'
          }`}
        >
          {message.message}
        </div>
      ))}
    </div>
  );
}
