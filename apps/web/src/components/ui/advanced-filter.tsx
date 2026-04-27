'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface AdvancedFilterProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  onClear?: () => void;
  className?: string;
}

export function AdvancedFilter({ fields, values, onChange, onClear, className }: AdvancedFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const hasActive = Object.values(values).some(v => v && v !== '');
  const activeCount = Object.values(values).filter(v => v && v !== '').length;

  const set = (key: string, value: string) => onChange({ ...values, [key]: value });
  const clear = () => { onChange({}); onClear?.(); };

  const visibleFields = expanded ? fields : fields.slice(0, 3);

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        {visibleFields.map(f => (
          <div key={f.key} className="flex-1 min-w-[140px] max-w-[220px]">
            {f.type === 'select' ? (
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={values[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
              >
                <option value="">{f.label}</option>
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'date' || f.type === 'daterange' ? (
              <Input
                type="date" placeholder={f.placeholder ?? f.label}
                value={values[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
                className="h-9 text-sm"
              />
            ) : (
              <Input
                placeholder={f.placeholder ?? f.label}
                value={values[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>
        ))}

        <div className="flex items-center gap-1">
          {fields.length > 3 && (
            <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={() => setExpanded(!expanded)}>
              <Filter className="h-3.5 w-3.5" />
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {!expanded && fields.length > 3 && <span className="text-xs">+{fields.length - 3}</span>}
            </Button>
          )}
          {hasActive && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground hover:text-destructive" onClick={clear}>
              <X className="h-3.5 w-3.5" />
              <span className="text-xs">Limpar ({activeCount})</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
