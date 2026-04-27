'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' };

export function Dialog({ open, onClose, title, description, children, size = 'md', scrollable }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={cn('w-full rounded-2xl bg-white shadow-2xl', sizes[size], scrollable && 'max-h-[90vh] flex flex-col overflow-hidden')}>
        <div className="flex items-start justify-between border-b border-border px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn('px-6 py-5', scrollable && 'flex-1 overflow-y-auto')}>{children}</div>
      </div>
    </div>
  );
}

export function DialogFooter({ children, className, sticky }: { children: React.ReactNode; className?: string; sticky?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-end gap-2 border-t border-border px-6 py-4 -mx-6 -mb-5 mt-6',
      sticky && 'sticky bottom-0 bg-white flex-shrink-0',
      className,
    )}>
      {children}
    </div>
  );
}
