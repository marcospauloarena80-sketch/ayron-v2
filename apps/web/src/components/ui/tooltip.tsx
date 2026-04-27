'use client';
import { useState, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={cn('absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-foreground text-background text-xs whitespace-nowrap shadow', className)}>
          {content}
        </div>
      )}
    </div>
  );
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function TooltipContent({ children, className }: { children: ReactNode; className?: string }) {
  return null;
}
