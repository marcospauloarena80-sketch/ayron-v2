'use client';
import { useQuery } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import api from '@/lib/api';

const ACTION_COLOR: Record<string, any> = { CREATE: 'success', UPDATE: 'secondary', MOVEMENT: 'default', RESERVATION: 'default', LOSS: 'danger', PURCHASE: 'warning', ADJUSTMENT: 'warning', COUNT: 'secondary' };

export default function AuditPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['inventory-audit'],
    queryFn: () => api.get('/inventory/audit').then(r => r.data),
  });

  return (
    <div>
      <Topbar title="Auditoria de Estoque" />
      <div className="p-6 space-y-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhum registro de auditoria</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Ação</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Ator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2"><Badge variant={ACTION_COLOR[log.action] ?? 'secondary'}>{log.action}</Badge></td>
                    <td className="px-4 py-2">{log.item?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{log.actor_user_id?.slice(0, 8) ?? 'SISTEMA'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
