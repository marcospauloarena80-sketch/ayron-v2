import { createClient } from '@/lib/supabase/client';

export interface BriefingData {
  lastEvolution: {
    id: string;
    date: string;
    type: string;
    medico: string;
    subjetivo: string;
    plano: string;
    cid: string;
    daysSince: number;
  } | null;
  activePrescriptions: Array<{
    id: string;
    date: string;
    validade: string | null;
    items: Array<{ med: string; dosagem: string }>;
    isExpired: boolean;
  }>;
  pendingExams: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
    lab: string | null;
  }>;
  activeProtocolTags: string[];
}

export async function fetchPatientBriefing(patientId: string): Promise<BriefingData> {
  const supabase = createClient();

  const [evolResult, prescResult, examResult] = await Promise.all([
    supabase
      .from('patient_evolutions')
      .select('id, date, type, cid, subjetivo, plano, professionals(name)')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('patient_prescriptions')
      .select('id, date, validade, prescription_items(med, dosagem)')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('patient_exams')
      .select('id, name, date, status, lab')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(5),
  ]);

  if (evolResult.error) throw evolResult.error;
  if (prescResult.error) throw prescResult.error;
  if (examResult.error) throw examResult.error;

  const now = new Date();

  const lastEv = evolResult.data;
  const lastEvolution = lastEv
    ? {
        id: lastEv.id,
        date: lastEv.date,
        type: lastEv.type,
        // Supabase join types don't model ad-hoc .select() strings — any cast intentional
        medico: (lastEv as any).professionals?.name ?? 'Desconhecido',
        subjetivo: lastEv.subjetivo ?? '',
        plano: lastEv.plano ?? '',
        cid: lastEv.cid ?? '',
        daysSince: Math.floor((now.getTime() - new Date(lastEv.date).getTime()) / 86_400_000),
      }
    : null;

  const activePrescriptions = (prescResult.data ?? []).map((p: any) => ({
    id: p.id,
    date: p.date,
    validade: p.validade,
    items: (p.prescription_items ?? []).map((i: any) => ({ med: i.med, dosagem: i.dosagem })),
    isExpired: p.validade ? new Date(p.validade) < now : false,
  }));

  const pendingExams = (examResult.data ?? []).filter(
    (e: any) => e.status === 'PENDING' || e.status === 'SOLICITADO',
  );

  return { lastEvolution, activePrescriptions, pendingExams, activeProtocolTags: [] }; // TODO: implement in sprint 2 from patient_protocol_tags table
}
