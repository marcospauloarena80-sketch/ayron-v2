import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: [
    'text-white font-semibold',
    '[background:var(--primary-gradient)]',
    'hover:[box-shadow:var(--primary-glow)] hover:-translate-y-px',
    'active:translate-y-0 active:opacity-90',
    'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
  ].join(' '),

  secondary: [
    'bg-white/70 backdrop-blur-sm',
    'border border-secondary/25 text-secondary',
    'hover:bg-white/90 hover:[box-shadow:var(--shadow-soft)] hover:-translate-y-px',
    'focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-1',
  ].join(' '),

  ghost: [
    'bg-transparent text-foreground',
    'hover:bg-white/60',
    'focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-1',
  ].join(' '),

  danger: [
    'bg-red-500 text-white',
    'hover:bg-red-600 hover:[box-shadow:0_0_12px_rgba(239,68,68,0.30)] hover:-translate-y-px',
    'focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-1',
  ].join(' '),
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'rounded-[10px] font-medium',
        'transition-all duration-[220ms] ease',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
