'use client';

import { useState, type FormEvent } from 'react';
import Modal from '@/components/Modal';
import { notify } from '@/components/feedback';
import type { ClientUser } from '@/components/useSession';

export default function StudentVerification({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: (user: ClientUser) => void;
}) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [busy, setBusy] = useState(false);

  async function submit(path: string, method: 'POST' | 'PUT', payload: object) {
    setBusy(true);
    try {
      const response = await fetch(path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể xác thực lúc này.');
      return result;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    const result = await submit('/api/auth/otp', 'POST', { email });
    if (result) {
      setStep('otp');
      notify(result.message ?? 'Đã gửi mã xác thực.', 'success');
    }
  }

  async function verify() {
    const result = await submit('/api/auth/otp', 'PUT', { email, otp });
    if (result) {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!response.ok) throw new Error('Không thể tải lại thông tin tài khoản.');
        const data = (await response.json()) as { user: ClientUser | null };
        if (data.user) onVerified(data.user);
        notify(result.message ?? 'Xác thực thành công.', 'success');
        onClose();
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
      }
    }
  }

  return (
    <Modal open={open} title="Xác thực sinh viên" onClose={onClose}>
      {step === 'email' ? (
        <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void sendCode(); }} className="space-y-4">
          <p className="text-sm leading-6 text-[#64766e]">
            Nhập email trường thuộc một trong các trường được hỗ trợ. Mã OTP có hiệu lực 5 phút.
          </p>
          <label className="block text-sm font-semibold">
            Email trường
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tenban@gm.uit.edu.vn"
              className="mt-2 w-full rounded-xl border border-[#dce4dd] px-4 py-3 font-normal outline-none focus:border-[#187b5b]"
            />
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white disabled:opacity-60">
            {busy ? 'Đang gửi...' : 'Gửi mã OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void verify(); }} className="space-y-4">
          <p className="text-sm leading-6 text-[#64766e]">
            Nhập mã 6 chữ số đã gửi đến <strong>{email}</strong>. Nhập sai 5 lần sẽ vô hiệu hóa mã.
          </p>
          <label className="block text-sm font-semibold">
            Mã OTP
            <input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              className="mt-2 w-full rounded-xl border border-[#dce4dd] px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-[#187b5b]"
            />
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white disabled:opacity-60">
            {busy ? 'Đang xác thực...' : 'Xác nhận'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendCode()}
            className="w-full text-sm font-semibold text-[#187b5b] disabled:opacity-60"
          >
            Gửi lại OTP
          </button>
        </form>
      )}
    </Modal>
  );
}
