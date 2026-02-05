'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'userName';

/**
 * Returns the user's name from localStorage (set during intro).
 * Falls back to "You" when skipped or not set.
 */
export function useUserName() {
  const [userName, setUserName] = useState<string>('You');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored?.trim()) {
      setUserName(stored.trim());
    }
  }, []);

  return {
    userName,
    /** First letter for avatar display (e.g. "M" for Michael) */
    avatarLetter: userName.charAt(0).toUpperCase() || 'Y',
  };
}
