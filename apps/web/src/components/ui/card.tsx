import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative z-0',
        'rounded-[16px] border border-white/60 p-6',
        'bg-white/[0.88] backdrop-blur-[16px]',
        '[box-shadow:0_4px_24px_rgba(0,0,0,0.09),0_1px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.90)]',
        'transition-all duration-[220ms] ease',
        'hover:[box-shadow:0_8px_32px_rgba(0,0,0,0.13),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.90)] hover:-translate-y-px',
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
