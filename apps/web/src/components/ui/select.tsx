import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
}

export function Select({ label, error, placeholder, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        <select
          className={cn(
            'w-full appearance-none rounded-lg border border-border bg-white px-3 py-2.5 pr-9 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed',
            !props.value && 'text-muted-foreground',
            error && 'border-red-400 focus:ring-red-200',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
