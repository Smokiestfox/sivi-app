'use client';

import { useEffect, useState } from 'react';

export default function PostCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void fetch('/api/posts?type=roommate', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không thể tải số lượng tin.');
        const result = (await response.json()) as { posts: unknown[] };
        setCount(result.posts.length);
      })
      .catch((error: unknown) => console.error(error));
  }, []);

  return count ?? '—';
}
