'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Save, Activity, Scale, Upload } from 'lucide-react';
import api from '@/lib/api';
import { BioimpedanceUploadModal } from '@/components/clinical/bioimpedance-upload-modal';

interface MetricField {
  key: string;
  label: string;
  unit: string;
  step?: string;
  min?: number;
  max?: number;
}

const FIELDS: MetricField[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg', step: '0.1', min: 0, max: 600 },
  { key: 'height_cm', label: 'Altura', unit: 'cm', step: '0.5', min: 0, max: 300 },
  { key: 'body_fat_pct', label: '% Gordura', unit: '%', step: '0.1', min: 0, max: 100 },
  { key: 'lean_mass_kg', label: 'Massa Magra', unit: 'kg', step: '0.1', min: 0 },
  { key: 'waist_cm', label: 'Circ. Abdominal', unit: 'cm', step: '0.5', min: 0, max: 300 },
  { key: 'bp_systolic', label: 'PA Sistólica', unit: 'mmHg', step: '1', min: 0 },
  { key: 'bp_diastolic', label: 'PA Diastólica', unit: 'mmHg', step: '1', min: 0 },
  { key: 'heart_rate', label: 'FC', unit: 'bpm', step: '1', min: 0 },
];

interface Props {
  patientId: string;
  appointmentId: string;
  readOnly?: boolean;
}

export function EndoMetricsForm({ patientId, appointmentId, readOnly }: Props) {
  const [bioUploadOpen, setBioUploadOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [bmi, setBmi] = useState<string | null>(null);
  const [isBioimpedance, setIsBioimpedance] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const w = parseFloat(values.weight_kg);
    const h = parseFloat(values.height_cm);
    if (w > 0 && h > 0) {
      setBmi((w / ((h / 100) ** 2)).toFixed(1));
    } else {
      setBmi(null);
    }
  }, [values.weight_kg, values.height_cm]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, any> = {
        patient_id: patientId,
        appointment_id: appointmentId,
        is_bioimpedance: isBioimpedance,
      };
      FIELDS.forEach(f => {
        if (values[f.key] !== undefined && values[f.key] !== '') {
          payload[f.key] = parseFloat(values[f.key]);
        }
      });
      return api.post('/clinical/metrics', payload).then(r => r.data);
    },
    onSuccess: () => {
      toast.success('Métricas registradas');
      qc.invalidateQueries({ queryKey: ['appointment-record', appointmentId] });
      qc.invalidateQueries({ queryKey: ['patient-history', patientId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao salvar métricas'),
  });

  const hasAnyValue = FIELDS.some(f => values[f.key] !== undefined && values[f.key] !== '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Métricas da Consulta</span>
        </div>
        {!readOnly && (
          <Button size="sm" variant="secondary" onClick={() => setBioUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            Bioimpedância
          </Button>
        )}
      </div>

      <BioimpedanceUploadModal
        patientId={patientId}
        appointmentId={appointmentId}
        open={bioUploadOpen}
        onClose={() => setBioUploadOpen(false)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map(f => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            <div className="relative">
              <input
                type="number"
                step={f.step}
                min={f.min}
                max={f.max}
                value={values[f.key] ?? ''}
                onChange={e => !readOnly && setValues(v => ({ ...v, [f.key]: e.target.value }))}
                readOnly={readOnly}
                placeholder="—"
                className={`w-full rounded-lg border border-border px-2.5 py-2 pr-9 text-sm outline-none tabular-nums ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-primary/30'}`}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {f.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {bmi && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">IMC calculado:</span>
          <span className={`text-sm font-bold ${parseFloat(bmi) >= 30 ? 'text-red-500' : parseFloat(bmi) >= 25 ? 'text-amber-500' : 'text-green-600'}`}>
            {bmi} kg/m²
          </span>
          <span className="text-xs text-muted-foreground">
            {parseFloat(bmi) < 18.5 ? '— Abaixo do peso' :
             parseFloat(bmi) < 25 ? '— Peso normal' :
             parseFloat(bmi) < 30 ? '— Sobrepeso' : '— Obesidade'}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Scale className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Medição por Bioimpedância</span>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && setIsBioimpedance(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isBioimpedance ? 'bg-blue-500' : 'bg-gray-200'} ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isBioimpedance ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </label>
        {!readOnly && (
          <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!hasAnyValue}>
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        )}
      </div>
    </div>
  );
}
