'use client';

import { useSidebar } from '@/contexts/SidebarContext';

export function useSidebarCollapsed() {
  const { sidebarCollapsed } = useSidebar();
  return sidebarCollapsed;
}
