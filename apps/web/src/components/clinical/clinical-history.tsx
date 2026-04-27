'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, FileText, Activity, Zap, Layers } from 'lucide-react';
import api from '@/lib/api';

interface Props {
  patientId: string;
}

function MetricRow({ label, value, unit }: { label: string; value: any; unit: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium tabular-nums">{String(value)} {unit}</span>
    </div>
  );
}

function RecordCollapse({ record }: { record: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium">
              {format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              Dr(a). {record.professional?.name ?? 'Profissional'} · {record.appointment?.service?.name ?? record.appointment?.type ?? 'Consulta'}
            </p>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && record.transcription && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{record.transcription}</p>
        </div>
      )}
    </div>
  );
}

export function ClinicalHistory({ patientId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['patient-history', patientId],
    queryFn: () => api.get(`/clinical/patients/${patientId}/history`).then(r => r.data),
  });

  if (isLoading) return <div className="h-32 rounded-xl bg-muted animate-pulse" />;

  const { records = [], metrics = [], protocols = [], implants = [] } = data ?? {};

  return (
    <div className="space-y-6">
      {/* Evoluções */}
      {records.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Evoluções Clínicas ({records.length})</h3>
          </div>
          {records.map((r: any) => <RecordCollapse key={r.id} record={r} />)}
        </div>
      )}

      {/* Métricas */}
      {metrics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Histórico de Métricas ({metrics.length})</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {['Data', 'Peso', 'IMC', '% Gord.', 'M.Magra', 'Cin.', 'PA', 'FC'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m: any) => (
                  <tr key={m.id} className="border-t border-border bg-white hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 tabular-nums">{format(new Date(m.created_at), 'dd/MM/yy')}</td>
                    <td className="px-3 py-2 tabular-nums">{m.weight_kg ? `${m.weight_kg}kg` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{m.bmi ? `${m.bmi}` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{m.lean_mass_kg ? `${m.lean_mass_kg}kg` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{m.waist_cm ? `${m.waist_cm}cm` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{m.bp_systolic && m.bp_diastolic ? `${m.bp_systolic}/${m.bp_diastolic}` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{m.heart_rate ? `${m.heart_rate}bpm` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Implantes */}
      {implants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold">Histórico de Implantes ({implants.length})</h3>
          </div>
          <div className="space-y-2">
            {implants.map((imp: any) => (
              <div key={imp.id} className="rounded-lg border border-border bg-white px-4 py-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{imp.hormone_type} — {imp.dosage_mg}mg</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(imp.application_date), 'dd/MM/yyyy')}</p>
                </div>
                {imp.next_change_date && (
                  <p className="text-xs text-amber-600 mt-1">Próxima troca: {format(new Date(imp.next_change_date), 'dd/MM/yyyy')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 && metrics.length === 0 && implants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mb-2 opacity-20" />
          <p className="text-sm">Sem histórico clínico ainda</p>
        </div>
      )}
    </div>
  );
}
