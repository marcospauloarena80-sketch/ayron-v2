'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Plus, Layers, CheckCircle, PauseCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';

const PROTOCOL_TYPES = [
  { value: 'EMAGRECIMENTO', label: 'Emagrecimento' },
  { value: 'GANHO_MASSA', label: 'Ganho de Massa' },
  { value: 'IMPLANTE_HORMONAL', label: 'Implante Hormonal' },
  { value: 'SOROTERAPIA', label: 'Soroterapia' },
  { value: 'LONGEVIDADE', label: 'Longevidade' },
  { value: 'NUTRICIONAL', label: 'Nutricional' },
  { value: 'PERSONALIZADO', label: 'Personalizado' },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ATIVO: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  PAUSADO: <PauseCircle className="h-3.5 w-3.5 text-amber-500" />,
  FINALIZADO: <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />,
  SUSPENSO: <XCircle className="h-3.5 w-3.5 text-red-500" />,
};
const STATUS_VARIANTS: Record<string, string> = {
  ATIVO: 'success', PAUSADO: 'warning', FINALIZADO: 'default', SUSPENSO: 'danger',
};

interface Props {
  patientId: string;
}

export function ProtocolManager({ patientId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'EMAGRECIMENTO', name: '', start_date: '', description: '' });
  const qc = useQueryClient();

  const { data: protocols = [] } = useQuery({
    queryKey: ['patient-protocols', patientId],
    queryFn: () => api.get(`/clinical/protocols/patient/${patientId}`).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/clinical/protocols', { ...form, patient_id: patientId }).then(r => r.data),
    onSuccess: () => {
      toast.success('Protocolo criado');
      qc.invalidateQueries({ queryKey: ['patient-protocols', patientId] });
      setOpen(false);
      setForm({ type: 'EMAGRECIMENTO', name: '', start_date: '', description: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao criar protocolo'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/clinical/protocols/${id}`, { status }).then(r => r.data),
    onSuccess: () => {
      toast.success('Protocolo atualizado');
      qc.invalidateQueries({ queryKey: ['patient-protocols', patientId] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Protocolos Ativos</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Novo
        </Button>
      </div>

      {protocols.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum protocolo registrado</p>
      ) : (
        <div className="space-y-2">
          {protocols.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  {STATUS_ICONS[p.status]}
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant={STATUS_VARIANTS[p.status] as any} className="text-[10px]">{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {PROTOCOL_TYPES.find(t => t.value === p.type)?.label} · Início: {format(new Date(p.start_date), 'dd/MM/yyyy')}
                </p>
              </div>
              {p.status === 'ATIVO' && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: p.id, status: 'PAUSADO' })}>Pausar</Button>
                  <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: p.id, status: 'FINALIZADO' })}>Finalizar</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Novo Protocolo" size="sm">
        <div className="space-y-3">
          <Select label="Tipo" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {PROTOCOL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="Nome do protocolo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Protocolo emagrecimento fase 1" />
          <Input label="Data de início" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          <Input label="Descrição (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!form.name || !form.start_date}>Criar</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
