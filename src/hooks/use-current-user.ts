'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_ID = 'active_user_id';
const STORAGE_KEY_NAME = 'active_user_name';
const STORAGE_KEY_COLOR = 'active_user_color';
const STORAGE_KEY_RELATIONSHIP = 'active_user_relationship';
const STORAGE_KEY_FAMILY_CODE = 'active_user_family_code';

// Default user (first seeded account)
const DEFAULT_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Michael',
  avatarColor: '#8b5cf6',
  relationship: 'Son',
  familyCode: 'FAMILY2024',
};

export interface CurrentUser {
  id: string;
  name: string;
  avatarColor: string;
  relationship: string;
  familyCode: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser>(DEFAULT_USER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY_ID);
    const name = localStorage.getItem(STORAGE_KEY_NAME);
    const color = localStorage.getItem(STORAGE_KEY_COLOR);
    const relationship = localStorage.getItem(STORAGE_KEY_RELATIONSHIP);
    const familyCode = localStorage.getItem(STORAGE_KEY_FAMILY_CODE);

    if (id && name) {
      setUser({
        id,
        name,
        avatarColor: color || DEFAULT_USER.avatarColor,
        relationship: relationship || '',
        familyCode: familyCode || '',
      });
    }
    setLoaded(true);
  }, []);

  const switchUser = useCallback((newUser: CurrentUser) => {
    localStorage.setItem(STORAGE_KEY_ID, newUser.id);
    localStorage.setItem(STORAGE_KEY_NAME, newUser.name);
    localStorage.setItem(STORAGE_KEY_COLOR, newUser.avatarColor);
    localStorage.setItem(STORAGE_KEY_RELATIONSHIP, newUser.relationship);
    localStorage.setItem(STORAGE_KEY_FAMILY_CODE, newUser.familyCode || '');
    localStorage.setItem('userName', newUser.name);
    setUser(newUser);
  }, []);

  const clearUser = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_COLOR);
    localStorage.removeItem(STORAGE_KEY_RELATIONSHIP);
    localStorage.removeItem(STORAGE_KEY_FAMILY_CODE);
    setUser(DEFAULT_USER);
  }, []);

  return { user, loaded, switchUser, clearUser };
}

/**
 * Set the active user from outside React (e.g. in a server action or redirect).
 */
export function setActiveUser(u: CurrentUser) {
  localStorage.setItem(STORAGE_KEY_ID, u.id);
  localStorage.setItem(STORAGE_KEY_NAME, u.name);
  localStorage.setItem(STORAGE_KEY_COLOR, u.avatarColor);
  localStorage.setItem(STORAGE_KEY_RELATIONSHIP, u.relationship);
  localStorage.setItem(STORAGE_KEY_FAMILY_CODE, u.familyCode || '');
  localStorage.setItem('userName', u.name);
}
