'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Zap, Plus, Calendar } from 'lucide-react';
import api from '@/lib/api';

const HORMONE_TYPES = ['Testosterona', 'Estradiol', 'Progesterona', 'DHEA', 'Anastrozol', 'Personalizado'];

interface Props {
  patientId: string;
  appointmentId?: string;
}

export function ImplantManager({ patientId, appointmentId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    hormone_type: 'Testosterona', dosage_mg: '', application_date: '',
    lot_number: '', next_change_date: '', site: '', observations: '',
  });
  const qc = useQueryClient();

  const { data: implants = [] } = useQuery({
    queryKey: ['patient-implants', patientId],
    queryFn: () => api.get(`/clinical/implants/patient/${patientId}`).then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/clinical/implants', {
      patient_id: patientId,
      appointment_id: appointmentId,
      hormone_type: form.hormone_type,
      dosage_mg: parseFloat(form.dosage_mg),
      application_date: form.application_date,
      lot_number: form.lot_number || undefined,
      next_change_date: form.next_change_date || undefined,
      site: form.site || undefined,
      observations: form.observations || undefined,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Implante registrado');
      qc.invalidateQueries({ queryKey: ['patient-implants', patientId] });
      qc.invalidateQueries({ queryKey: ['patient-history', patientId] });
      setOpen(false);
      setForm({ hormone_type: 'Testosterona', dosage_mg: '', application_date: '', lot_number: '', next_change_date: '', site: '', observations: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao registrar implante'),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-secondary" />
          <span className="text-sm font-semibold">Implantes Hormonais</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Registrar
        </Button>
      </div>

      {implants.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum implante registrado</p>
      ) : (
        <div className="space-y-2">
          {implants.map((imp: any) => (
            <div key={imp.id} className="rounded-lg border border-border bg-white px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-secondary" />
                  <span className="text-sm font-medium">{imp.hormone_type} — {imp.dosage_mg}mg</span>
                </div>
                {imp.next_change_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Próxima troca: {format(new Date(imp.next_change_date), 'dd/MM/yyyy')}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aplicado em {format(new Date(imp.application_date), 'dd/MM/yyyy')}
                {imp.site ? ` · ${imp.site}` : ''}
                {imp.lot_number ? ` · Lote: ${imp.lot_number}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Registrar Implante Hormonal" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Hormônio</label>
              <select
                value={form.hormone_type}
                onChange={e => setForm(f => ({ ...f, hormone_type: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                {HORMONE_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <Input label="Dosagem (mg)" type="number" step="0.5" min="0" value={form.dosage_mg} onChange={e => setForm(f => ({ ...f, dosage_mg: e.target.value }))} placeholder="Ex: 100" />
            <Input label="Data de aplicação" type="date" value={form.application_date} onChange={e => setForm(f => ({ ...f, application_date: e.target.value }))} />
            <Input label="Próxima troca" type="date" value={form.next_change_date} onChange={e => setForm(f => ({ ...f, next_change_date: e.target.value }))} />
            <Input label="Local de aplicação" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="Ex: Glúteo direito" />
            <Input label="Lote" value={form.lot_number} onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="Número do lote" />
          </div>
          <Input label="Observações" value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} placeholder="Observações adicionais..." />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.dosage_mg || !form.application_date}>Registrar</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
