'use client';
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns/format';
import { differenceInYears } from 'date-fns/differenceInYears';
import { ptBR } from 'date-fns/locale';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EvolutionEditor } from '@/components/clinical/evolution-editor';
import { EndoMetricsForm } from '@/components/clinical/endo-metrics-form';
import { ProtocolManager } from '@/components/clinical/protocol-form';
import { ImplantManager } from '@/components/clinical/implant-form';
import { ClinicalHistory } from '@/components/clinical/clinical-history';
import { DocumentsList } from '@/components/documents/documents-list';
import { CreateDocumentModal } from '@/components/documents/create-document-modal';
import {
  ArrowLeft, Calendar, Clock, FileText, Activity,
  Zap, Layers, History, AlertCircle, Scale, User,
  ChevronRight, Lock, FilePlus, Receipt, TestTube,
} from 'lucide-react';
import api from '@/lib/api';

const APPT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'info', CONFIRMED: 'primary', CHECKED_IN: 'warning',
  IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger', MISSED: 'danger',
};
const APPT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', CHECKED_IN: 'Check-in feito',
  IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', MISSED: 'Faltou',
};

type Section = 'evolucao' | 'metricas' | 'protocolos' | 'implante' | 'documentos' | 'historico';

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { id: 'evolucao', label: 'Evolução Clínica', shortLabel: 'Evolução', icon: <FileText className="h-4 w-4" /> },
  { id: 'metricas', label: 'Métricas + Bioimpedância', shortLabel: 'Métricas', icon: <Activity className="h-4 w-4" /> },
  { id: 'protocolos', label: 'Protocolos Ativos', shortLabel: 'Protocolos', icon: <Layers className="h-4 w-4" /> },
  { id: 'implante', label: 'Implante Hormonal', shortLabel: 'Implante', icon: <Zap className="h-4 w-4" /> },
  { id: 'documentos', label: 'Documentos / Receitas', shortLabel: 'Documentos', icon: <FilePlus className="h-4 w-4" /> },
  { id: 'historico', label: 'Histórico do Paciente', shortLabel: 'Histórico', icon: <History className="h-4 w-4" /> },
];

export default function AppointmentRecordPage() {
  const { id: patientId, appointmentId } = useParams<{ id: string; appointmentId: string }>();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('evolucao');
  const [quickDocType, setQuickDocType] = useState<string | null>(null);

  const { data: appt, isLoading, error } = useQuery({
    queryKey: ['appointment-record', appointmentId],
    queryFn: () => api.get(`/clinical/appointments/${appointmentId}`).then(r => r.data),
    enabled: !!appointmentId,
  });

  if (isLoading) {
    return (
      <div>
        <Topbar title="Modo Médico" />
        <div className="flex h-[calc(100vh-60px)] gap-0">
          <div className="w-52 border-r border-border bg-white p-3 space-y-1.5">
            {[...Array(5)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />)}
          </div>
          <div className="flex-1 p-6 space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !appt) {
    return (
      <div>
        <Topbar title="Consulta" />
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mb-2 text-red-400" />
          <p className="text-sm font-medium">Agendamento não encontrado</p>
          <p className="text-xs mt-1">Verifique se a consulta existe e se o check-in foi realizado</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.push(`/patients/${patientId}`)}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao paciente
          </Button>
        </div>
      </div>
    );
  }

  const patient = appt.patient;
  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;
  const existingRecord = appt.clinical_records?.[0] ?? null;
  const latestMetrics = appt.patient_metrics?.[0] ?? null;
  const FINALIZED = ['COMPLETED', 'CANCELLED', 'MISSED'];
  const isFinalized = FINALIZED.includes(appt.status);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Compact topbar for doctor mode */}
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-2.5 flex-shrink-0">
        <button onClick={() => router.push(`/patients/${patientId}`)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <User className="h-3.5 w-3.5" />
          Paciente 360°
        </button>
        <span className="text-muted-foreground">·</span>
        <span className="text-sm font-bold text-foreground">{patient.full_name}</span>
        {age !== null && <span className="text-xs text-muted-foreground">{age} anos</span>}
        <Badge variant={APPT_STATUS_COLORS[appt.status] as any}>{APPT_STATUS_LABELS[appt.status] ?? appt.status}</Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
          <Calendar className="h-3 w-3" />
          {format(new Date(appt.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
          {appt.service && <><Clock className="h-3 w-3 ml-2" />{appt.service.name}</>}
        </span>
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR — fixed doctor navigation */}
        <nav className="w-52 flex-shrink-0 border-r border-border bg-gray-50 flex flex-col overflow-y-auto">
          <div className="p-3 space-y-1 flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">Modo Médico</p>
            {SIDEBAR_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors text-left ${
                  activeSection === item.id
                    ? 'bg-primary text-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-white hover:text-foreground'
                }`}
              >
                {item.icon}
                <span className="flex-1 truncate">{item.shortLabel}</span>
                {activeSection === item.id && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
              </button>
            ))}
          </div>

          {/* Quick doc shortcuts */}
          <div className="border-t border-border p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Atalhos Rápidos</p>
            <button
              onClick={() => { setQuickDocType('PRESCRIPTION'); setActiveSection('documentos'); }}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <Receipt className="h-3.5 w-3.5" /> Receita Simples
            </button>
            <button
              onClick={() => { setQuickDocType('EXAM_REQUEST'); setActiveSection('documentos'); }}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <TestTube className="h-3.5 w-3.5" /> Pedido de Exames
            </button>
            <button
              onClick={() => { setQuickDocType('PRESCRIPTION_CONTROLLED'); setActiveSection('documentos'); }}
              className="w-full flex items-center gap-2 text-xs text-amber-500 hover:text-amber-700 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <FilePlus className="h-3.5 w-3.5" /> Receita Controlada
            </button>
          </div>

          {/* Metrics summary at bottom of sidebar */}
          {latestMetrics && (
            <div className="border-t border-border p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Última medição</p>
              {latestMetrics.weight_kg && <SidebarMetric label="Peso" value={`${latestMetrics.weight_kg}kg`} />}
              {latestMetrics.bmi && <SidebarMetric label="IMC" value={String(latestMetrics.bmi)} />}
              {latestMetrics.body_fat_pct && <SidebarMetric label="% Gordura" value={`${latestMetrics.body_fat_pct}%`} />}
              {latestMetrics.bp_systolic && <SidebarMetric label="PA" value={`${latestMetrics.bp_systolic}/${latestMetrics.bp_diastolic}`} />}
              {latestMetrics.is_bioimpedance && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-[10px] font-medium">
                  <Scale className="h-2.5 w-2.5" />Bioimpedância
                </span>
              )}
            </div>
          )}
        </nav>

        {/* MAIN CONTENT — changes based on activeSection */}
        <main className="flex-1 overflow-y-auto p-5">
          {/* Finalized banner */}
          {isFinalized && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Consulta finalizada — edição bloqueada</p>
                <p className="text-xs text-amber-600">Esta consulta está em modo somente leitura. Para corrigir dados, contacte o gestor.</p>
              </div>
              <Badge variant="warning" className="ml-auto">{APPT_STATUS_LABELS[appt.status] ?? appt.status}</Badge>
            </div>
          )}
          {activeSection === 'evolucao' && (
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Evolução Clínica
                {existingRecord && <Badge variant="success">Registrado</Badge>}
              </h2>
              <Card>
                <EvolutionEditor patientId={patientId} appointmentId={appointmentId} existingRecord={existingRecord} readOnly={isFinalized} />
              </Card>
            </div>
          )}

          {activeSection === 'metricas' && (
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Métricas + Bioimpedância
              </h2>
              <Card>
                <div className="p-4">
                  <EndoMetricsForm patientId={patientId} appointmentId={appointmentId} readOnly={isFinalized} />
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'protocolos' && (
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Protocolos Ativos
              </h2>
              <Card>
                <ProtocolManager patientId={patientId} />
              </Card>
            </div>
          )}

          {activeSection === 'implante' && (
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Implante Hormonal
              </h2>
              <Card>
                <ImplantManager patientId={patientId} appointmentId={appointmentId} />
              </Card>
            </div>
          )}

          {activeSection === 'documentos' && (
            <div className="max-w-3xl">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <FilePlus className="h-4 w-4 text-primary" />
                Documentos e Receitas
              </h2>
              <DocumentsList
                patientId={patientId}
                appointmentId={appointmentId}
              />
              {quickDocType && (
                <CreateDocumentModal
                  open={true}
                  onClose={() => setQuickDocType(null)}
                  patientId={patientId}
                  appointmentId={appointmentId}
                  initialType={quickDocType as any}
                />
              )}
            </div>
          )}

          {activeSection === 'historico' && (
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico do Paciente
              </h2>
              <Card>
                <ClinicalHistory patientId={patientId} />
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
