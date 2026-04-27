'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { AyronWidget } from '@/components/ayron/ayron-widget';
import { CommandPalette } from '@/components/layout/command-palette';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    }
    function onCustom() { setCmdOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-cmd-palette', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-cmd-palette', onCustom);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <AyronWidget />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
