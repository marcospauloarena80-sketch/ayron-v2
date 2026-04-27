'use client';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Save, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns/format';
import api from '@/lib/api';

interface Props {
  patientId: string;
  appointmentId: string;
  existingRecord?: { id: string; transcription: string | null; structured_data: any } | null;
  readOnly?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export function EvolutionEditor({ patientId, appointmentId, existingRecord, readOnly }: Props) {
  const [transcription, setTranscription] = useState(existingRecord?.transcription ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const qc = useQueryClient();
  const isSavingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(existingRecord?.transcription ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/clinical/records', {
        patient_id: patientId,
        appointment_id: appointmentId,
        transcription: transcription.trim() || undefined,
      }).then(r => r.data),
    onSuccess: () => {
      setSaveStatus('saved');
      setSavedAt(new Date());
      lastSavedRef.current = transcription;
      isSavingRef.current = false;
      qc.invalidateQueries({ queryKey: ['appointment-record', appointmentId] });
      qc.invalidateQueries({ queryKey: ['patient-history', patientId] });
    },
    onError: (e: any) => {
      isSavingRef.current = false;
      setSaveStatus('idle');
      toast.error(e.response?.data?.message ?? 'Erro ao salvar evolução');
    },
  });

  function doSave() {
    if (isSavingRef.current) return;
    if (!transcription.trim()) return;
    if (transcription === lastSavedRef.current) return;
    isSavingRef.current = true;
    setSaveStatus('saving');
    mutation.mutate();
  }

  useEffect(() => {
    if (readOnly) return;
    if (transcription === lastSavedRef.current) return;

    setSaveStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSave();
    }, 10_000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [transcription, readOnly]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Evolução Clínica</span>
        {existingRecord && <span className="text-xs text-muted-foreground">(editando registro existente)</span>}
      </div>

      <textarea
        value={transcription}
        onChange={e => !readOnly && setTranscription(e.target.value)}
        readOnly={readOnly}
        placeholder={readOnly ? 'Consulta finalizada — somente leitura' : 'Anamnese, conduta, observações clínicas, orientações ao paciente...'}
        rows={8}
        className={`w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none resize-none transition-shadow font-mono leading-relaxed ${readOnly ? 'bg-gray-50 text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-primary/30'}`}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{transcription.length} caracteres</p>
          {!readOnly && saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
            </span>
          )}
          {!readOnly && saveStatus === 'saved' && savedAt && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" /> Salvo às {format(savedAt, 'HH:mm')}
            </span>
          )}
        </div>
        {!readOnly && (
          <Button
            size="sm"
            onClick={doSave}
            disabled={mutation.isPending || !transcription.trim() || transcription === lastSavedRef.current}
          >
            <Save className="h-3.5 w-3.5" /> Salvar Evolução
          </Button>
        )}
      </div>
    </div>
  );
}
