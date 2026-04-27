'use client';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, CheckCircle, AlertTriangle, Loader2, X, FileText } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ExtractedField {
  key: string;
  label: string;
  value: string | number;
  confidence: number;
}

interface Props {
  patientId: string;
  appointmentId?: string;
  open: boolean;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  weight: 'Peso (kg)',
  height: 'Altura (cm)',
  bmi: 'IMC',
  body_fat_pct: 'Gordura Corporal (%)',
  lean_mass_kg: 'Massa Magra (kg)',
  visceral_fat: 'Gordura Visceral',
  body_water_pct: 'Água Corporal (%)',
  muscle_mass_kg: 'Massa Muscular (kg)',
  bone_mass_kg: 'Massa Óssea (kg)',
  metabolic_age: 'Idade Metabólica',
  basal_metabolism: 'Metabolismo Basal (kcal)',
};

export function BioimpedanceUploadModal({ patientId, appointmentId, open, onClose }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedField[] | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');

  const uploadMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append('file', f);
      if (appointmentId) fd.append('appointment_id', appointmentId);
      const res = await api.post(`/bioimpedancia/patients/${patientId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const fields: ExtractedField[] = Object.entries(data.extracted ?? {}).map(([key, val]: any) => ({
        key,
        label: FIELD_LABELS[key] ?? key,
        value: val?.value ?? val,
        confidence: val?.confidence ?? 1,
      }));
      setExtracted(fields);
      const initial: Record<string, string> = {};
      fields.forEach(f => { initial[f.key] = String(f.value ?? ''); });
      setEditedValues(initial);
      setStep('review');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao processar arquivo'),
  });

  const confirmMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      api.post(`/bioimpedancia/patients/${patientId}/confirm`, {
        appointment_id: appointmentId,
        values: Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '').map(([k, v]) => [k, parseFloat(v) || v])),
      }),
    onSuccess: () => {
      toast.success('Bioimpedância registrada com sucesso!');
      qc.invalidateQueries({ queryKey: ['patient-metrics', patientId] });
      setStep('done');
      setTimeout(() => { onClose(); resetState(); }, 1200);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao confirmar dados'),
  });

  const resetState = () => {
    setFile(null);
    setExtracted(null);
    setEditedValues({});
    setStep('upload');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); uploadMutation.mutate(f); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">Bioimpedância — Upload e Extração</h2>
          </div>
          <button onClick={() => { onClose(); resetState(); }} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie o arquivo de resultado da bioimpedância (imagem ou PDF). Os dados serão extraídos automaticamente.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para enviar</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF ou TXT</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.pdf,.txt"
                onChange={handleFileChange}
              />
            </div>
            <div className="text-center">
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setStep('review')}
              >
                Preencher manualmente
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-3">
            {extracted === null ? (
              <p className="text-sm text-muted-foreground">Preencha os valores manualmente:</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Extração concluída — verifique e confirme os valores
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {Object.keys(FIELD_LABELS).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-44 shrink-0">{FIELD_LABELS[key]}</label>
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={editedValues[key] ?? ''}
                      onChange={e => setEditedValues(v => ({ ...v, [key]: e.target.value }))}
                      placeholder="—"
                    />
                    {extracted?.find(f => f.key === key)?.confidence != null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        (extracted.find(f => f.key === key)?.confidence ?? 0) >= 0.8
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {Math.round((extracted.find(f => f.key === key)?.confidence ?? 0) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {extracted !== null && extracted.some(f => f.confidence < 0.8) && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Alguns campos têm baixa confiança — revise antes de confirmar
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setExtracted(null); setFile(null); }}>Voltar</Button>
              <Button
                size="sm"
                onClick={() => confirmMutation.mutate(editedValues)}
                loading={confirmMutation.isPending}
              >
                Confirmar e Salvar
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-8 gap-2">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="font-medium text-sm">Registrado com sucesso!</p>
          </div>
        )}
      </div>
    </div>
  );
}
