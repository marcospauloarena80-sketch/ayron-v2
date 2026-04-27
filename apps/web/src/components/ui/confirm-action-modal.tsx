'use client';
import { useState, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  userName?: string;
  userRole?: string;
  children?: ReactNode;
}

export function ConfirmActionModal({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirmar', variant = 'default',
  isLoading, userName, userRole, children,
}: ConfirmActionModalProps) {
  const [checked, setChecked] = useState(false);

  const handleClose = () => { setChecked(false); onClose(); };
  const handleConfirm = () => { if (!checked) return; setChecked(false); onConfirm(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {title}
        </div>

        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        {children && <div>{children}</div>}

        {(userName || userRole) && (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Usuário logado: </span>
            <span className="font-semibold">{userName ?? '—'}</span>
            {userRole && <span className="ml-1 text-xs text-muted-foreground">({userRole})</span>}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            id="confirm-check"
            type="checkbox"
            className="rounded"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
          />
          <label htmlFor="confirm-check" className="text-sm cursor-pointer">
            Confirmo que sou este usuário e quero prosseguir
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>Cancelar</Button>
          <Button
            variant={variant === 'destructive' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            disabled={!checked || isLoading}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
