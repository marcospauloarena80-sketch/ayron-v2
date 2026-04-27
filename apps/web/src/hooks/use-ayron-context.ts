'use client';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import type { AyronContext } from '@/lib/ayron-chat';

function pathToModule(pathname: string): string {
  if (pathname.startsWith('/patients')) return 'patients';
  if (pathname.startsWith('/agenda')) return 'agenda';
  if (pathname.startsWith('/clinical')) return 'clinical';
  if (pathname.startsWith('/financial')) return 'financial';
  if (pathname.startsWith('/marketing')) return 'marketing';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/messages')) return 'messages';
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/sessions')) return 'sessions';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/ayron')) return 'ayron';
  return 'dashboard';
}

function extractIdFromPath(pathname: string, prefix: string): string | undefined {
  const match = pathname.match(new RegExp(`${prefix}/([^/]+)`));
  return match?.[1];
}

export function useAyronContext(overrides?: Partial<AyronContext>): AyronContext {
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);

  const module = pathToModule(pathname);
  const patientId = extractIdFromPath(pathname, '/patients');
  const prontuarioId = extractIdFromPath(pathname, '/clinical');

  return {
    module,
    patientId,
    prontuarioId,
    userId: user?.id,
    userRole: user?.role,
    clinicId: user?.clinic_id,
    ...overrides,
  };
}
