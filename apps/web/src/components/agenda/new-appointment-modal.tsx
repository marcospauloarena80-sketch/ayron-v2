'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, User, Stethoscope, Package, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import api from '@/lib/api';
import { insertAppointment, insertPatient } from '@/lib/supabase/queries';

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consulta', RETURN: 'Retorno', PROCEDURE: 'Procedimento',
  EVALUATION: 'Avaliação', TELECONSULTATION: 'Teleconsulta', EXAM_REVIEW: 'Revisão de Exames',
};

function SearchField<T>({
  label, icon: Icon, placeholder, value, display, onSearch, onSelect, results, renderResult, required,
}: {
  label: string;
  icon: any;
  placeholder: string;
  value: T | null;
  display: string;
  onSearch: (q: string) => void;
  onSelect: (item: T) => void;
  results: T[];
  renderResult: (item: T) => React.ReactNode;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (q: string) => {
    setQuery(q);
    onSearch(q);
    setOpen(true);
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium truncate">{display}</span>
          </div>
          <button type="button" onClick={() => { onSelect(null as any); }} className="text-xs text-muted-foreground hover:text-foreground">Trocar</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={placeholder}
              value={query}
              onChange={e => handleInput(e.target.value)}
              onFocus={() => { if (results.length > 0) setOpen(true); }}
              autoComplete="off"
            />
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white shadow-xl max-h-48 overflow-y-auto">
              {results.map((item, i) => (
                <button key={i} type="button" onMouseDown={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b border-border/50 last:border-0 transition-colors">
                  {renderResult(item)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AvailabilityPicker({
  professionalId, date, selectedSlot, onSelect,
}: {
  professionalId: string; date: string; selectedSlot: string | null; onSelect: (slot: string) => void;
}) {
  const { data: slots = [], isLoading } = useQuery<string[]>({
    queryKey: ['agenda-availability', professionalId, date],
    queryFn: () => api.get('/agenda/availability', { params: { professional_id: professionalId, date } }).then(r => r.data),
    enabled: !!professionalId && !!date,
  });

  const shifts = {
    Manhã: slots.filter(s => { const h = parseInt(s.split(':')[0]); return h >= 7 && h < 12; }),
    Tarde: slots.filter(s => { const h = parseInt(s.split(':')[0]); return h >= 12 && h < 18; }),
    Noite: slots.filter(s => { const h = parseInt(s.split(':')[0]); return h >= 18; }),
  };

  if (isLoading) return <div className="h-16 rounded-lg bg-muted animate-pulse" />;
  if (!slots.length) return (
    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
      <span className="text-xs text-orange-700">Sem horários disponíveis neste dia</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {Object.entries(shifts).map(([shift, times]) => times.length > 0 && (
        <div key={shift}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{shift}</p>
          <div className="flex flex-wrap gap-1.5">
            {times.map(t => (
              <button key={t} type="button" onClick={() => onSelect(t)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedSlot === t ? 'border-primary bg-primary text-white' : 'border-border bg-white hover:bg-muted/50 hover:border-primary/40'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  preselectedPatientId?: string;
  preselectedTime?: Date;
}

export function NewAppointmentModal({ open, onClose, preselectedPatientId, preselectedTime }: Props) {
  const qc = useQueryClient();

  const [patient, setPatient] = useState<any>(null);
  const [professional, setProfessional] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [type, setType] = useState('CONSULTATION');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [recDays, setRecDays] = useState<number[]>([]);
  const [recMonths, setRecMonths] = useState(1);

  const [patientQuery, setPatientQuery] = useState('');
  const [professionalQuery, setProfessionalQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineCreateLoading, setInlineCreateLoading] = useState(false);

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debounce = (key: string, fn: () => void, ms = 300) => {
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(fn, ms);
  };

  const { data: patientResults = [] } = useQuery<any[]>({
    queryKey: ['patient-search', patientQuery],
    queryFn: () => api.get('/patients', { params: { search: patientQuery, limit: 8 } }).then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    enabled: patientQuery.length >= 2 && !preselectedPatientId,
  });

  const { data: preselectedPatient } = useQuery({
    queryKey: ['patient', preselectedPatientId],
    queryFn: () => api.get(`/patients/${preselectedPatientId}`).then(r => r.data),
    enabled: !!preselectedPatientId && open,
  });

  const { data: professionalResults = [] } = useQuery<any[]>({
    queryKey: ['professional-search', professionalQuery],
    queryFn: () => api.get('/professionals', { params: { search: professionalQuery } }).then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    enabled: professionalQuery.length >= 2 || professionalQuery === '',
  });

  const { data: serviceResults = [] } = useQuery<any[]>({
    queryKey: ['service-search', serviceQuery],
    queryFn: () => api.get('/services', { params: { search: serviceQuery } }).then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    enabled: serviceQuery.length >= 1 || serviceQuery === '',
  });

  useEffect(() => {
    if (preselectedPatient && !patient) setPatient(preselectedPatient);
  }, [preselectedPatient]);

  // Auto-suggest recurrence days from patient preferences
  useEffect(() => {
    if (patient?.preferences?.preferred_days?.length) {
      setRecDays(patient.preferences.preferred_days);
    }
  }, [patient?.id]);

  useEffect(() => {
    if (preselectedTime && open) {
      setDate(format(preselectedTime, 'yyyy-MM-dd'));
      const h = String(preselectedTime.getHours()).padStart(2, '0');
      const m = String(preselectedTime.getMinutes()).padStart(2, '0');
      setSelectedSlot(`${h}:${m}`);
    }
  }, [preselectedTime, open]);

  useEffect(() => {
    if (!open) {
      setPatient(preselectedPatient ?? null);
      setProfessional(null); setService(null);
      setType('CONSULTATION'); setDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedSlot(null); setNotes('');
      setPatientQuery(''); setProfessionalQuery(''); setServiceQuery('');
      setRecDays([]); setRecMonths(1);
      setShowInlineCreate(false); setInlineName(''); setInlinePhone('');
    }
  }, [open]);

  const canSubmit = !!patient && !!professional && !!date && !!selectedSlot;

  const mutation = useMutation({
    mutationFn: async () => {
      const [h, m] = selectedSlot!.split(':').map(Number);
      const durationMin = service?.duration_min ?? 30;

      const buildAppt = (d: string, slot: string) => {
        const [sh, sm] = slot.split(':').map(Number);
        const start = new Date(d + 'T00:00:00');
        start.setHours(sh, sm, 0, 0);
        const end = new Date(start.getTime() + durationMin * 60 * 1000);
        return {
          patient_id: patient.id,
          professional_id: professional.id,
          service_id: service?.id ?? undefined,
          type,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          notes: notes || undefined,
        };
      };

      if (recDays.length === 0) {
        const start = new Date(date + 'T00:00:00');
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + durationMin * 60 * 1000);
        const apptData = buildAppt(date, selectedSlot!);
        await insertAppointment({ ...apptData, start_time: start.toISOString(), end_time: end.toISOString() });
        return { created: 1, skipped: 0, firstName: patient?.full_name };
      }

      // Recurring: iterate days over recMonths
      const rangeEnd = addMonths(new Date(date + 'T00:00:00'), recMonths);
      let cursor = addDays(new Date(date + 'T00:00:00'), 1);
      let created = 0, skipped = 0;

      while (cursor <= rangeEnd) {
        if (recDays.includes(cursor.getDay())) {
          const d = format(cursor, 'yyyy-MM-dd');
          try {
            await insertAppointment(buildAppt(d, selectedSlot!));
            created++;
          } catch { skipped++; }
        }
        cursor = addDays(cursor, 1);
      }
      return { created, skipped, firstName: patient?.full_name };
    },
    onSuccess: (r: any) => {
      if (r.created === 1 && r.skipped === 0 && recDays.length === 0) {
        toast.success(`Agendado — ${r.firstName}`);
      } else {
        toast.success(`${r.created} agendamento(s) criado(s)${r.skipped > 0 ? ` · ${r.skipped} sem horário disponível` : ''}`);
      }
      qc.invalidateQueries({ queryKey: ['agenda'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['unscheduled-patients'] });
      onClose();
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Erro ao criar agendamento';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title="Novo Agendamento" size="md">
      <div className="space-y-4">

        <SearchField
          label="Paciente"
          icon={User}
          placeholder="Buscar por nome, CPF ou telefone..."
          value={preselectedPatientId ? (patient ?? preselectedPatient) : patient}
          display={patient?.full_name ?? ''}
          onSearch={q => { debounce('patient', () => setPatientQuery(q)); if (showInlineCreate) setShowInlineCreate(false); }}
          onSelect={p => setPatient(p)}
          results={preselectedPatientId ? [] : patientResults}
          renderResult={p => (
            <div>
              <p className="font-medium">{p.full_name}</p>
              <p className="text-[11px] text-muted-foreground">{p.cpf ?? p.phone ?? ''}</p>
            </div>
          )}
          required
        />

        {/* Criar novo paciente */}
        {!patient && !preselectedPatientId && patientQuery.length >= 2 && !showInlineCreate && (
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline -mt-2"
            onClick={() => { setInlineName(patientQuery); setShowInlineCreate(true); }}
          >
            <Plus className="h-3.5 w-3.5" /> Criar novo paciente: &quot;{patientQuery}&quot;
          </button>
        )}

        {showInlineCreate && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-primary">Pré-cadastro de paciente</p>
            <input
              placeholder="Nome completo *"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={inlineName}
              onChange={e => setInlineName(e.target.value)}
            />
            <input
              placeholder="Telefone *"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={inlinePhone}
              onChange={e => setInlinePhone(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Dados complementares podem ser preenchidos no cadastro do paciente.</p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowInlineCreate(false)}>Cancelar</Button>
              <Button
                type="button"
                size="sm"
                loading={inlineCreateLoading}
                disabled={!inlineName.trim() || !inlinePhone.trim()}
                onClick={async () => {
                  setInlineCreateLoading(true);
                  try {
                    const r = await insertPatient({ full_name: inlineName.trim(), phone: inlinePhone.trim() });
                    setPatient(r);
                    setShowInlineCreate(false);
                    toast.success(`Paciente "${inlineName.trim()}" cadastrado`);
                  } catch (e: any) {
                    toast.error((e as any).message ?? 'Erro ao cadastrar paciente');
                  } finally {
                    setInlineCreateLoading(false);
                  }
                }}
              >
                Cadastrar
              </Button>
            </div>
          </div>
        )}

        {patient && (
          <div className="rounded-lg bg-muted/30 border border-border px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
            {patient.tier && <span>Tier: <strong className="text-foreground">{patient.tier}</strong></span>}
            {patient.tipo_contato && <span>Contato: <strong className="text-foreground">{patient.tipo_contato}</strong></span>}
            {patient.status && <span>Status: <strong className={patient.status === 'ATIVO' ? 'text-green-600' : 'text-red-500'}>{patient.status}</strong></span>}
          </div>
        )}

        <SearchField
          label="Profissional"
          icon={Stethoscope}
          placeholder="Buscar por nome ou especialidade..."
          value={professional}
          display={professional ? `Dr(a). ${professional.name} — ${professional.specialty ?? 'Geral'}` : ''}
          onSearch={q => debounce('professional', () => setProfessionalQuery(q))}
          onSelect={p => { setProfessional(p); setSelectedSlot(null); }}
          results={professionalResults}
          renderResult={p => (
            <div>
              <p className="font-medium">Dr(a). {p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.specialty ?? 'Geral'}</p>
            </div>
          )}
          required
        />

        <SearchField
          label="Serviço / Procedimento"
          icon={Package}
          placeholder="Buscar serviço..."
          value={service}
          display={service ? `${service.name}${service.duration_min ? ` · ${service.duration_min}min` : ''}` : ''}
          onSearch={q => debounce('service', () => setServiceQuery(q))}
          onSelect={s => setService(s)}
          results={serviceResults}
          renderResult={s => (
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">{s.duration_min ? `${s.duration_min}min` : ''} {s.price ? `· R$ ${Number(s.price).toFixed(2)}` : ''}</p>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo *</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={type} onChange={e => setType(e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data *</label>
            <input
              type="date"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => { setDate(e.target.value); setSelectedSlot(null); }}
            />
          </div>
        </div>

        {professional && date && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">
                Horários disponíveis — {format(new Date(date + 'T12:00:00'), "EEEE, dd/MM", { locale: ptBR })} *
              </label>
            </div>
            <AvailabilityPicker
              professionalId={professional.id}
              date={date}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
            />
          </div>
        )}

        {!professional && (
          <div className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
            Selecione um profissional para ver os horários disponíveis
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Motivo, preparo, orientações..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Agendamento Recorrente */}
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Agendamento Recorrente (opcional)</p>
          {patient?.preferences?.preferred_days?.length > 0 && recDays.length === 0 && (
            <p className="text-[11px] text-primary">
              Preferência do paciente: {(['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'] as const).filter((_, i) => patient.preferences.preferred_days.includes(i)).join(', ')}
            </p>
          )}
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Dias da semana:</p>
            <div className="flex gap-1.5 flex-wrap">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i) => (
                <button key={i} type="button"
                  onClick={() => setRecDays(prev => prev.includes(i) ? prev.filter(x=>x!==i) : [...prev,i])}
                  className={`h-8 w-10 rounded-lg border text-xs font-medium transition-colors ${recDays.includes(i)?'bg-primary text-white border-primary':'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground whitespace-nowrap">Repetir por</label>
            <input type="number" min={1} max={24} value={recMonths} onChange={e=>setRecMonths(Number(e.target.value))}
              className="w-16 rounded-lg border px-2 py-1 text-sm text-center" />
            <span className="text-[11px] text-muted-foreground">meses</span>
          </div>
        </div>

        {!canSubmit && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Preencha paciente, profissional, data e horário para agendar
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending}>
            Agendar
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
