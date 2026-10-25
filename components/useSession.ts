'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ClientUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: 'guest' | 'student' | 'admin';
  is_verified: boolean;
  university_id: string | null;
  university_email: string | null;
}

export function useSession() {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!response.ok) throw new Error('Không thể tải thông tin đăng nhập.');
      const data = (await response.json()) as { user: ClientUser | null };
      setUser(data.user);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh().catch((error: unknown) => {
      console.error(error);
    });
  }, [refresh]);

  return { user, loaded, refresh };
}
