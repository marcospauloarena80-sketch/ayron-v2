import { cn } from '@/lib/utils';

/* NOTE: No backdrop-blur — badges render N times in lists/tables.
   Use bg-opacity + border only to maintain performance. */

const variants: Record<string, string> = {
  default:  'bg-muted/80 text-foreground border border-border/60',
  primary:  'bg-primary/15 text-primary border border-primary/25',
  success:  'bg-green-50/80 text-green-700 border border-green-200/70',
  warning:  'bg-amber-50/80 text-amber-700 border border-amber-200/70',
  danger:   'bg-red-50/80 text-red-700 border border-red-200/70',
  info:     'bg-blue-50/80 text-blue-700 border border-blue-200/70',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
