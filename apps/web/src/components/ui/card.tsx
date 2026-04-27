import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return <div className={cn('rounded-xl border border-border bg-white p-6 shadow-sm', className)} {...props} />;
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  return <h3 className={cn('text-sm font-semibold text-muted-foreground uppercase tracking-wide', className)} {...props} />;
}

export function CardValue({ className, ...props }: CardProps) {
  return <p className={cn('text-3xl font-bold text-foreground', className)} {...props} />;
}
