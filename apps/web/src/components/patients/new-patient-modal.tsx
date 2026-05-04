'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Camera, X, Upload, Plus, Lock, ShieldCheck, Info, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { tagsService, CAN_CREATE_TAG, TagsApiNotAvailableError } from '@/lib/tags-service';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { insertPatient, updatePatient } from '@/lib/supabase/queries';

// ─── Mask helpers ──────────────────────────────────────────────
function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}
function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{0,3})/, '$1-$2');
}

// ─── Schemas ───────────────────────────────────────────────────
const schemaFull = z.object({
  full_name: z.string().min(3, 'Nome obrigatório (mín. 3 caracteres)'),
  birth_date: z.string().min(1, 'Data de nascimento obrigatória'),
  sex: z.enum(['M', 'F', 'OUTRO'], { required_error: 'Sexo obrigatório' }),
  phone: z.string().min(10, 'Telefone obrigatório (mín. 10 dígitos)'),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  nationality: z.string().default('BR'),
  foreign_doc_type: z.string().optional(),
  foreign_doc_number: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
  tier: z.string().optional(),
  tier_especialidade: z.string().optional(),
  tipo_contato: z.string().optional(),
  mala_direta: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  address: z.object({
    cep: z.string().min(1, 'CEP obrigatório'),
    street: z.string().min(1, 'Logradouro obrigatório'),
    number: z.string().min(1, 'Número obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().min(1, 'Cidade obrigatória'),
    state: z.string().min(1, 'Estado obrigatório'),
  }).optional(),
  preferences: z.object({
    preferred_days: z.array(z.number()).optional(),
    preferred_shift: z.string().optional(),
    preferred_time_start: z.string().optional(),
    preferred_time_end: z.string().optional(),
    dietary: z.string().optional(),
    personal: z.string().optional(),
  }).optional(),
  empresa: z.string().optional(),
  referencia: z.string().optional(),
  conheceu_por: z.string().optional(),
  indicado_por: z.string().optional(),
  estado_civil: z.string().optional(),
  profissao: z.string().optional(),
  escolaridade: z.string().optional(),
  religiao: z.string().optional(),
  pai: z.string().optional(),
  mae: z.string().optional(),
  acompanhante: z.string().optional(),
  filhos: z.string().optional(),
  conjuge: z.string().optional(),
  matricula: z.string().optional(),
  convenio: z.string().optional(),
  numero_cns: z.string().optional(),
  tipo_contato_cadastro: z.string().optional(),
});

const schemaBypass = z.object({
  full_name: z.string().min(1, 'Nome obrigatório'),
  birth_date: z.string().optional(),
  sex: z.enum(['M', 'F', 'OUTRO']).optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  nationality: z.string().default('BR'),
  foreign_doc_type: z.string().optional(),
  foreign_doc_number: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  tier: z.string().optional(),
  tier_especialidade: z.string().optional(),
  tipo_contato: z.string().optional(),
  mala_direta: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  address: z.object({
    cep: z.string().optional(), street: z.string().optional(),
    number: z.string().optional(), complement: z.string().optional(),
    neighborhood: z.string().optional(), city: z.string().optional(), state: z.string().optional(),
  }).optional(),
  preferences: z.object({
    preferred_days: z.array(z.number()).optional(),
    preferred_shift: z.string().optional(), preferred_time_start: z.string().optional(),
    preferred_time_end: z.string().optional(), dietary: z.string().optional(), personal: z.string().optional(),
  }).optional(),
  empresa: z.string().optional(),
  referencia: z.string().optional(),
  conheceu_por: z.string().optional(),
  indicado_por: z.string().optional(),
  estado_civil: z.string().optional(),
  profissao: z.string().optional(),
  escolaridade: z.string().optional(),
  religiao: z.string().optional(),
  pai: z.string().optional(),
  mae: z.string().optional(),
  acompanhante: z.string().optional(),
  filhos: z.string().optional(),
  conjuge: z.string().optional(),
  matricula: z.string().optional(),
  convenio: z.string().optional(),
  numero_cns: z.string().optional(),
  tipo_contato_cadastro: z.string().optional(),
});

type FormData = z.infer<typeof schemaFull>;

const TABS = ['Dados Pessoais', 'Documentos', 'Endereço', 'Complementares', 'Preferências', 'Classificação'] as const;
type TabId = typeof TABS[number];
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SHIFTS = [{ value: 'MANHA', label: 'Manhã' }, { value: 'TARDE', label: 'Tarde' }, { value: 'NOITE', label: 'Noite' }];
const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'VIP', 'PLATINA', 'DIAMANTE'];
const TIPO_CONTATO_LIST = ['WHATSAPP', 'EMAIL', 'SMS', 'INSTAGRAM', 'INDICACAO', 'TELEFONE'];
const DEFAULT_TAGS = ['EMBAIXADOR', 'GELADEIRA', 'FROZEN', 'DIAMANTE', 'APENAS_CONSULTA', 'VIP_PLUS', 'RISCO_EVASAO', 'RESTRICAO', 'PACIENTE_DIFICIL'];
const MASTER_PASSWORD = 'MASTER@2024';

interface Props {
  open: boolean;
  onClose: () => void;
  patient?: any;
}

export function NewPatientModal({ open, onClose, patient }: Props) {
  const isEdit = !!patient;
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('Dados Pessoais');
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(patient?.photo_url ?? null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [masterBypass, setMasterBypass] = useState(false);
  const [showMasterInput, setShowMasterInput] = useState(false);
  const [masterInput, setMasterInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const user = useAuthStore(s => s.user);
  const canCreateTag = CAN_CREATE_TAG.includes((user?.role ?? '') as typeof CAN_CREATE_TAG[number]);
  const { data: apiTagsList = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsService.list,
    staleTime: 5 * 60 * 1000,
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Foto deve ter no máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(masterBypass ? schemaBypass as any : schemaFull),
    defaultValues: { nationality: 'BR', mala_direta: false, tags: [], preferences: { preferred_days: [] } },
  });

  useEffect(() => {
    if (patient && open) {
      const addr = patient.address ?? {};
      const prefs = patient.preferences ?? {};
      reset({
        full_name: patient.full_name ?? '',
        birth_date: patient.birth_date ? patient.birth_date.split('T')[0] : '',
        sex: patient.sex ?? 'F',
        phone: patient.phone ?? '',
        cpf: patient.cpf ?? '',
        rg: patient.rg ?? '',
        nationality: patient.nationality ?? 'BR',
        foreign_doc_type: patient.foreign_doc_type ?? '',
        foreign_doc_number: patient.foreign_doc_number ?? '',
        email: patient.email ?? '',
        notes: patient.notes ?? '',
        tier: patient.tier ?? '',
        tier_especialidade: patient.tier_especialidade ?? '',
        tipo_contato: patient.tipo_contato ?? '',
        mala_direta: patient.mala_direta ?? false,
        tags: patient.tags ?? [],
        address: {
          cep: addr.cep ?? '', street: addr.street ?? '', number: addr.number ?? '',
          complement: addr.complement ?? '', neighborhood: addr.neighborhood ?? '',
          city: addr.city ?? '', state: addr.state ?? '',
        },
        preferences: {
          preferred_days: prefs.preferred_days ?? [],
          preferred_shift: prefs.preferred_shift ?? '',
          preferred_time_start: prefs.preferred_time_start ?? '',
          preferred_time_end: prefs.preferred_time_end ?? '',
          dietary: prefs.dietary ?? '',
          personal: prefs.personal ?? '',
        },
      });
    } else if (!patient && open) {
      reset({ nationality: 'BR', mala_direta: false, tags: [], preferences: { preferred_days: [] } });
    }
  }, [patient, open, reset]);

  const nationality = watch('nationality');
  const prefDays = watch('preferences.preferred_days') ?? [];
  const selectedTags = watch('tags') ?? [];
  const mala_direta = watch('mala_direta');

  const toggleDay = (day: number) => {
    setValue('preferences.preferred_days', prefDays.includes(day) ? prefDays.filter(d => d !== day) : [...prefDays, day]);
  };

  const toggleTag = (tag: string) => {
    setValue('tags', selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag]);
  };

  const addCustomTag = async () => {
    const t = newTagInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!t) return;
    try {
      await tagsService.create(t);
      await qc.invalidateQueries({ queryKey: ['tags'] });
      setValue('tags', [...selectedTags, t]);
      toast.success(`Tag "${t}" criada`);
    } catch (e) {
      if (e instanceof TagsApiNotAvailableError) {
        toast.error('Criação de tags globais requer atualização do backend (POST /tags)');
      } else {
        toast.error('Erro ao criar tag');
      }
    }
    setNewTagInput('');
  };

  const handleMasterUnlock = () => {
    if (masterInput === MASTER_PASSWORD) {
      setMasterBypass(true);
      setLgpdConsent(true);
      setShowMasterInput(false);
      setMasterInput('');
      toast.success('Modo Master ativado — campos obrigatórios liberados');
    } else {
      toast.error('Senha master incorreta');
      setMasterInput('');
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const prefs = data.preferences ?? {};
      const payload: any = {
        ...data,
        cpf: data.cpf?.replace(/\D/g, '') || undefined,
        phone: data.phone?.replace(/\D/g, '') || undefined,
        email: data.email || undefined,
        tier: data.tier || undefined,
        tipo_contato: data.tipo_contato || undefined,
        empresa: data.empresa || undefined,
        referencia: data.referencia || undefined,
        conheceu_por: data.conheceu_por || undefined,
        indicado_por: data.indicado_por || undefined,
        estado_civil: data.estado_civil || undefined,
        profissao: data.profissao || undefined,
        escolaridade: data.escolaridade || undefined,
        religiao: data.religiao || undefined,
        pai: data.pai || undefined,
        mae: data.mae || undefined,
        acompanhante: data.acompanhante || undefined,
        filhos: data.filhos || undefined,
        conjuge: data.conjuge || undefined,
        matricula: data.matricula || undefined,
        convenio: data.convenio || undefined,
        numero_cns: data.numero_cns || undefined,
        tipo_contato_cadastro: data.tipo_contato_cadastro || undefined,
        preferences: {
          preferred_days: prefs.preferred_days ?? [],
          preferred_shift: prefs.preferred_shift || undefined,
          preferred_time_start: prefs.preferred_time_start || undefined,
          preferred_time_end: prefs.preferred_time_end || undefined,
          dietary: prefs.dietary || undefined,
          personal: prefs.personal || undefined,
        },
      };
      if (isEdit) {
        try {
          return await updatePatient(patient.id, payload);
        } catch {
          return api.patch(`/patients/${patient.id}`, payload).then(r => r.data);
        }
      }
      try {
        return await insertPatient(payload);
      } catch {
        return api.post('/patients', payload).then(r => r.data);
      }
    },
    onSuccess: async (p: any) => {
      if (!isEdit && lgpdConsent) {
        try {
          const supabase = createClient();
          await supabase.from('patients').update({
            lgpd_consent: true,
            lgpd_consent_at: new Date().toISOString(),
          }).eq('id', p.id);
        } catch {
          // best effort
        }
      }
      toast.success(isEdit ? `Paciente ${p.full_name} atualizado` : `Paciente ${p.full_name} criado`);
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['patient', patient?.id] });
      handleClose();
    },
    onError: (e: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[NewPatientModal] response:', e.response?.data);
      }
      const status = e.response?.status;
      const raw = e.response?.data?.message ?? e.response?.data?.error ?? (isEdit ? 'Erro ao atualizar paciente' : 'Erro ao criar paciente');
      const messages = Array.isArray(raw) ? raw : [raw];
      toast.error(messages[0], {
        description: [
          status ? `HTTP ${status}` : null,
          messages.slice(1).join(' · ') || null,
        ].filter(Boolean).join(' — ') || undefined,
      });
    },
  });

  const handleClose = () => {
    reset({ nationality: 'BR', mala_direta: false, tags: [], preferences: { preferred_days: [] } });
    setTab('Dados Pessoais');
    setLgpdConsent(false);
    setPhotoPreview(null);
    setMasterBypass(false);
    setShowMasterInput(false);
    setMasterInput('');
    setNewTagInput('');
    onClose();
  };

  const allTags = apiTagsList.length > 0
    ? apiTagsList.map(t => t.name)
    : DEFAULT_TAGS;

  const tabHasError = (t: TabId): boolean => {
    if (t === 'Dados Pessoais') return !!(errors.full_name || errors.birth_date || errors.sex || errors.phone || errors.email);
    if (t === 'Documentos') return !!(errors.cpf || errors.foreign_doc_type || errors.foreign_doc_number);
    if (t === 'Endereço') return !!(errors.address?.cep || errors.address?.street || errors.address?.number || errors.address?.city || errors.address?.state);
    return false;
  };

  const firstTabWithError = (): TabId | null => {
    const order: TabId[] = ['Dados Pessoais', 'Documentos', 'Endereço'];
    return order.find(t => tabHasError(t)) ?? null;
  };

  const handleFormError = (errs: any) => {
    const messages: string[] = [];
    function collect(obj: any) {
      for (const v of Object.values(obj)) {
        if ((v as any)?.message) messages.push((v as any).message);
        else if (typeof v === 'object' && v !== null) collect(v);
      }
    }
    collect(errs);
    const preview = messages.slice(0, 3).join(', ');
    const extra = messages.length > 3 ? ` e mais ${messages.length - 3}` : '';
    toast.error(`Dados incompletos: ${preview}${extra}`);
    const errTab = firstTabWithError();
    if (errTab) setTab(errTab);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Editar Paciente' : 'Novo Paciente'}
      description="Endocrinologia — Consultório Particular"
      size="lg"
      scrollable
    >
      {/* Master bypass banner */}
      {masterBypass && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3 text-xs text-amber-700">
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
          Modo Master ativo — campos obrigatórios liberados. Paciente será salvo com dados incompletos.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 mb-4">
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors relative',
              tab === t ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}>
            {t}
            {tabHasError(t) && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d), handleFormError)}>
        {/* Tab: Dados Pessoais */}
        {tab === 'Dados Pessoais' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Photo upload */}
            <div className="col-span-2 flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Foto" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotoPreview(null)}
                      className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/60 flex items-center justify-center">
                      <X className="h-2.5 w-2.5 text-white" />
                    </button>
                  </>
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground/40" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Foto do paciente</p>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <Button type="button" variant="secondary" size="sm" onClick={() => photoInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {photoPreview ? 'Trocar foto' : 'Adicionar foto'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP · máx 5MB</p>
              </div>
            </div>

            <div className="col-span-2">
              <Input label="Nome completo *" placeholder="Nome completo" error={errors.full_name?.message} {...register('full_name')} />
            </div>
            <Input label={masterBypass ? 'Data de nascimento' : 'Data de nascimento *'} type="date" error={errors.birth_date?.message} {...register('birth_date')} />
            <Select label={masterBypass ? 'Sexo' : 'Sexo *'} error={errors.sex?.message} {...register('sex')}>
              <option value="">Selecione</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="OUTRO">Outro</option>
            </Select>
            <Controller name="phone" control={control} render={({ field }) => (
              <Input label={masterBypass ? 'Telefone / WhatsApp' : 'Telefone / WhatsApp *'} placeholder="(00) 00000-0000" error={errors.phone?.message}
                value={field.value ? maskPhone(field.value) : ''} onChange={e => field.onChange(e.target.value)} />
            )} />
            <div className="col-span-2">
              <Input label="E-mail" type="email" placeholder="paciente@email.com" error={errors.email?.message} {...register('email')} />
            </div>
            <div className="col-span-2">
              <Input label="Observações iniciais" placeholder="Objetivo, encaminhamento, contexto clínico..." {...register('notes')} />
            </div>
          </div>
        )}

        {/* Tab: Documentos */}
        {tab === 'Documentos' && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Nacionalidade" {...register('nationality')}>
              <option value="BR">Brasileiro(a)</option>
              <option value="ESTRANGEIRO">Estrangeiro(a)</option>
            </Select>
            {nationality !== 'ESTRANGEIRO' ? (
              <>
                <Controller name="cpf" control={control} render={({ field }) => (
                  <Input label="CPF" placeholder="000.000.000-00" error={errors.cpf?.message}
                    value={field.value ? maskCpf(field.value) : ''} onChange={e => field.onChange(e.target.value)} />
                )} />
                <Input label="RG" placeholder="0000000" {...register('rg')} />
              </>
            ) : (
              <>
                <Select label="Tipo de Documento" {...register('foreign_doc_type')}>
                  <option value="PASSAPORTE">Passaporte</option>
                  <option value="DNI">DNI</option>
                  <option value="RNE">RNE</option>
                  <option value="OUTRO">Outro</option>
                </Select>
                <div className="col-span-2">
                  <Input label="Número do Documento" {...register('foreign_doc_number')} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Endereço */}
        {tab === 'Endereço' && (
          <div className="grid grid-cols-2 gap-4">
            <Controller name="address.cep" control={control} render={({ field }) => (
              <Input label="CEP" placeholder="00000-000"
                value={field.value ? maskCep(field.value) : ''} onChange={e => field.onChange(e.target.value)} />
            )} />
            <Input label="Estado" placeholder="SP" {...register('address.state')} />
            <div className="col-span-2">
              <Input label="Rua / Logradouro" placeholder="Rua, Avenida..." {...register('address.street')} />
            </div>
            <Input label="Número" placeholder="123" {...register('address.number')} />
            <Input label="Complemento" placeholder="Apto, Bloco..." {...register('address.complement')} />
            <Input label="Bairro" placeholder="Bairro" {...register('address.neighborhood')} />
            <Input label="Cidade" placeholder="Cidade" {...register('address.city')} />
          </div>
        )}

        {/* Tab: Complementares */}
        {tab === 'Complementares' && (
          <div className="space-y-4">
            {/* Dados de Convênio */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados de Convênio</p>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Matrícula" {...register('matricula')} />
                <Input label="Convênio" {...register('convenio')} />
                <Input label="Nº CNS" {...register('numero_cns')} />
              </div>
            </div>
            {/* Tipo de Contato */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tipo de Contato</p>
              <Select label="Tipo" {...register('tipo_contato_cadastro')}>
                <option value="">Selecione</option>
                {['Paciente','Fornecedor','Médico','Amigos/Família','Fidelidade','Em andamento','Não concluídos','Palestras','Outros'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            {/* Dados Complementares 1 */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Complementares</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Empresa" {...register('empresa')} />
                <Input label="Referência" {...register('referencia')} />
                <Select label="Origem do Paciente" {...register('conheceu_por')}>
                  <option value="">Selecione</option>
                  {['Instagram','WhatsApp','Indicação','Tráfego Pago','Presencial','Email','Facebook','Internet','Jornal/Revista','Palestra','Propaganda','Outros'].map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Input label="Indicado por" placeholder="Buscar contato..." {...register('indicado_por')} />
                <Select label="Estado Civil" {...register('estado_civil')}>
                  <option value="">Selecione</option>
                  {['Solteiro','Casado','Divorciado','Viúvo'].map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Input label="Profissão" {...register('profissao')} />
                <Select label="Escolaridade" {...register('escolaridade')}>
                  <option value="">Selecione</option>
                  {['Analfabeto','Primeiro Grau','Segundo Grau','Terceiro Grau','Pós-Graduação'].map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Input label="Religião" {...register('religiao')} />
              </div>
            </div>
            {/* Dados Complementares 2 */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Família</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Pai" {...register('pai')} />
                <Input label="Mãe" {...register('mae')} />
                <Input label="Cônjuge" {...register('conjuge')} />
                <Input label="Acompanhante" {...register('acompanhante')} />
                <Input label="Nº de Filhos" type="number" {...register('filhos')} />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Preferências */}
        {tab === 'Preferências' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-2">Dias preferidos para consulta</p>
              <div className="flex gap-2 flex-wrap">
                {WEEK_DAYS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={cn('h-9 w-12 rounded-lg border text-sm font-medium transition-colors',
                      prefDays.includes(i) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select label="Turno preferido" {...register('preferences.preferred_shift')}>
                <option value="">Qualquer</option>
                {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
              <Input label="Horário início" type="time" {...register('preferences.preferred_time_start')} />
              <Input label="Horário fim" type="time" {...register('preferences.preferred_time_end')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Preferências alimentares</label>
              <textarea {...register('preferences.dietary')} rows={2}
                placeholder="Ex.: Vegetariana, sem glúten, sem lactose, café sem açúcar..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Observações pessoais</label>
              <textarea {...register('preferences.personal')} rows={2}
                placeholder="Ex.: Prefere atendimento com médica, acompanhante necessário..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>
        )}

        {/* Tab: Classificação */}
        {tab === 'Classificação' && (
          <div className="space-y-5">
            {/* Tier */}
            <div>
              <p className="text-sm font-medium mb-2">Tier do Paciente</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {TIERS.map(t => (
                  <button key={t} type="button" onClick={() => setValue('tier', watch('tier') === t ? '' : t)}
                    className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors',
                      watch('tier') === t
                        ? t === 'DIAMANTE' ? 'bg-cyan-500 text-white border-cyan-500'
                          : t === 'PLATINA' ? 'bg-purple-500 text-white border-purple-500'
                          : t === 'VIP' ? 'bg-amber-500 text-white border-amber-500'
                          : t === 'GOLD' ? 'bg-yellow-500 text-white border-yellow-500'
                          : t === 'SILVER' ? 'bg-gray-400 text-white border-gray-400'
                          : 'bg-orange-400 text-white border-orange-400'
                        : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {t}
                  </button>
                ))}
              </div>
              <Input label="Especialidade / Médico de referência (complementar)"
                placeholder="Ex.: Endocrinologia — Dr. Carlos, Dermatologia — Dra. Ana"
                {...register('tier_especialidade')} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Tier baseado em consumo prescrito: Bronze 0% · Prata 25% · Ouro 50% · VIP 75% · Diamante 100%
              </p>
            </div>

            {/* Tipo de contato preferido */}
            <div>
              <p className="text-sm font-medium mb-2">Canal de Contato Preferido</p>
              <div className="flex gap-2 flex-wrap">
                {TIPO_CONTATO_LIST.map(t => (
                  <button key={t} type="button" onClick={() => setValue('tipo_contato', watch('tipo_contato') === t ? '' : t)}
                    className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      watch('tipo_contato') === t ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Mala Direta */}
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Mala Direta</p>
                <p className="text-xs text-muted-foreground">Paciente autoriza recebimento de comunicações de marketing (promoções, campanhas, newsletters)</p>
              </div>
              <button type="button" onClick={() => setValue('mala_direta', !mala_direta)}
                className={cn('relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
                  mala_direta ? 'bg-primary' : 'bg-muted border border-border')}>
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                  mala_direta ? 'left-[calc(100%-1.375rem)]' : 'left-0.5')} />
              </button>
            </div>

            {/* Tags */}
            <div>
              <p className="text-sm font-medium mb-2">Tags</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {allTags.map(t => (
                  <button key={t} type="button" onClick={() => toggleTag(t)}
                    className={cn('px-2.5 py-1 rounded-full border text-xs font-medium transition-colors',
                      selectedTags.includes(t) ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {t.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              {/* Inline create tag — visible only for GERENTE/ADMIN/MASTER */}
              {canCreateTag && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                    placeholder="Criar nova tag..."
                    className="flex-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={addCustomTag} disabled={!newTagInput.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Tags selecionadas: {selectedTags.length > 0 ? selectedTags.join(', ') : 'nenhuma'}</p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6" sticky>
          <div className="flex items-center gap-2 flex-1 mr-2 flex-wrap">
            {!isEdit && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary" />
                <span>
                  <strong className="text-foreground">Consentimento LGPD</strong> — paciente autoriza uso dos dados para tratamento médico (Lei 13.709/2018).
                </span>
              </label>
            )}
            {/* Master password bypass */}
            {!isEdit && !masterBypass && (
              <div className="ml-auto flex-shrink-0">
                {showMasterInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="password"
                      value={masterInput}
                      onChange={e => setMasterInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleMasterUnlock(); if (e.key === 'Escape') setShowMasterInput(false); }}
                      placeholder="Senha master..."
                      autoFocus
                      className="w-32 rounded-lg border border-amber-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={handleMasterUnlock}>OK</Button>
                    <button type="button" onClick={() => setShowMasterInput(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowMasterInput(true)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-amber-600 transition-colors">
                    <Lock className="h-3 w-3" /> Acesso Master
                  </button>
                )}
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending} disabled={!isEdit && !lgpdConsent && !masterBypass}>
            {isEdit ? 'Salvar alterações' : 'Criar Paciente'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
