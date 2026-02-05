'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CreateAlbumContextValue {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const CreateAlbumContext = createContext<CreateAlbumContextValue | null>(null);

export function CreateAlbumProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  return (
    <CreateAlbumContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </CreateAlbumContext.Provider>
  );
}

export function useCreateAlbum() {
  const ctx = useContext(CreateAlbumContext);
  if (!ctx) throw new Error('useCreateAlbum must be used within CreateAlbumProvider');
  return ctx;
}
