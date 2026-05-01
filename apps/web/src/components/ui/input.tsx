import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-[10px] px-3 py-2.5 text-sm outline-none',
          'bg-white/60 backdrop-blur-sm',
          'border border-white/50',
          'placeholder:text-muted-foreground/60',
          'transition-all duration-[150ms] ease',
          'focus:ring-[3px] focus:ring-primary/25 focus:border-primary/50 focus:bg-white/80',
          error
            ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
            : '',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
