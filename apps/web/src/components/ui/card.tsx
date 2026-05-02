import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative z-0',
        'rounded-[16px] border border-white/40 p-6',
        'bg-white/[0.72] backdrop-blur-[16px]',
        '[box-shadow:var(--glass-shadow)]',
        'transition-all duration-[220ms] ease',
        'hover:[box-shadow:var(--glass-shadow-hover)] hover:-translate-y-px',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  return (
    <h3
      className={cn('text-sm font-semibold uppercase tracking-wide', className)}
      style={{ color: 'var(--text-secondary)' }}
      {...props}
    />
  );
}

export function CardValue({ className, ...props }: CardProps) {
  return (
    <p
      className={cn('text-3xl font-bold', className)}
      style={{ color: 'var(--text-primary)' }}
      {...props}
    />
  );
}
