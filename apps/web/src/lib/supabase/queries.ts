'use client';
import { createClient } from './client';

// ── Patients ────────────────────────────────────────────────────────────────

export async function fetchPatients({
  search,
  page,
  limit,
}: {
  search?: string;
  page: number;
  limit: number;
}) {
  const supabase = createClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('full_name');

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%,cpf.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const patients = (data ?? []).map((p: any) => ({
    ...p,
    // days_absent calculado a partir de updated_at como proxy até termos join com appointments
    days_absent: p.days_absent ?? 0,
    next_appointment_date: p.next_appointment_date ?? null,
  }));

  return {
    data: patients,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function fetchAllPatients() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, birth_date, sex, phone, email, current_status, tags, tier, tipo_contato, mala_direta')
    .order('full_name');
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ ...p, days_absent: 0 }));
}

// ── Professionals ────────────────────────────────────────────────────────────

export async function fetchProfessionals() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

// ── Treatment Protocols ──────────────────────────────────────────────────────

export async function fetchProtocols() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('treatment_protocols')
    .select(`
      *,
      patients ( full_name ),
      professionals ( name )
    `)
    .order('next_session_date', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    patient_id: p.patient_id,
    patient_name: p.patients?.full_name ?? 'Desconhecido',
    protocol_name: p.protocol_name,
    category: p.category,
    total_sessions: p.total_sessions,
    completed_sessions: p.completed_sessions,
    next_session_date: p.next_session_date,
    last_session_date: p.last_session_date,
    start_date: p.start_date,
    status: p.status,
    professional: p.professionals?.name ?? '—',
    interval_days: p.interval_days,
    notes: p.notes,
  }));
}

// ── Financial Transactions ────────────────────────────────────────────────────

export async function fetchFinancialTransactions({
  from,
  to,
  tipo,
}: {
  from?: string;
  to?: string;
  tipo?: string;
} = {}) {
  const supabase = createClient();
  let query = supabase
    .from('financial_transactions')
    .select('*')
    .order('vencimento', { ascending: false });

  if (from) query = query.gte('vencimento', from);
  if (to) query = query.lte('vencimento', to);
  if (tipo) query = query.eq('tipo', tipo);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((t: any) => ({
    ...t,
    saldo: Number(t.valor) - Number(t.pago ?? 0),
    controle: t.id.slice(0, 8).toUpperCase(),
  }));
}

export async function insertFinancialTransaction(data: {
  descricao: string;
  valor: number;
  tipo: 'RECEBER' | 'PAGAR';
  vencimento: string;
  pago_em?: string;
  classificacao?: string;
  conta?: string;
  filial?: string;
  forma_pagamento?: string;
  patient_id?: string;
}): Promise<any> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('financial_transactions')
    .insert({
      ...data,
      status: data.pago_em ? 'PAGO' : 'ABERTO',
      pago: data.pago_em ? data.valor : 0,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...row, saldo: Number(row.valor) - Number(row.pago ?? 0), controle: row.id.slice(0, 8).toUpperCase() };
}

// ── Appointments ──────────────────────────────────────────────────────────────

// ── Clinical Hub ─────────────────────────────────────────────────────────────

export async function fetchPatientsForClinical(search?: string): Promise<any[]> {
  const supabase = createClient();

  let query = supabase
    .from('patients')
    .select(`
      id, full_name, birth_date, sex, current_status, photo_url, professional_id,
      treatment_protocols ( protocol_name, status ),
      professionals ( name )
    `)
    .order('full_name');

  if (search) {
    query = (query as any).or(`full_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p: any) => {
    const birthDate = p.birth_date ? new Date(p.birth_date) : null;
    const age = birthDate
      ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;
    const procedures = (p.treatment_protocols ?? [])
      .filter((tp: any) => tp.status !== 'CONCLUIDO')
      .map((tp: any) => tp.protocol_name)
      .filter(Boolean);
    return {
      id: p.id,
      name: p.full_name,
      age,
      last_consult: null,
      status: p.current_status ?? 'ATIVO',
      medico: p.professionals?.name ?? '—',
      procedures,
      risk: 'LOW' as const,
      photo_url: p.photo_url ?? null,
      risk_reasons: [] as string[],
    };
  });
}

export async function fetchPatientAnamnese(patientId: string): Promise<any | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patient_medical_history')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchPatientEvolutions(patientId: string): Promise<any[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patient_evolutions')
    .select('*, professionals ( name )')
    .eq('patient_id', patientId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((ev: any) => ({
    ...ev,
    medico: ev.professionals?.name ?? 'Desconhecido',
  }));
}

export async function fetchPatientPrescriptions(patientId: string): Promise<any[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patient_prescriptions')
    .select('*, prescription_items ( * ), professionals ( name )')
    .eq('patient_id', patientId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    medico: r.professionals?.name ?? 'Desconhecido',
    items: r.prescription_items ?? [],
  }));
}

export async function fetchPatientExams(patientId: string): Promise<any[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patient_exams')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((ex: any) => ({
    ...ex,
    data: ex.date,
  }));
}

export async function insertEvolution(
  patientId: string,
  evData: { type: string; cid: string; subjetivo: string; objetivo: string; avaliacao: string; plano: string }
): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patient_evolutions')
    .insert({
      patient_id: patientId,
      date: new Date().toISOString().split('T')[0],
      type: evData.type,
      cid: evData.cid || 'Não informado',
      subjetivo: evData.subjetivo,
      objetivo: evData.objetivo,
      avaliacao: evData.avaliacao,
      plano: evData.plano,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertAnamnese(patientId: string, anamneseData: any): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('patient_medical_history')
    .upsert({ patient_id: patientId, ...anamneseData }, { onConflict: 'patient_id' });
  if (error) throw error;
}

export async function insertPrescription(
  patientId: string,
  prescData: { items: any[]; validade: string }
): Promise<any> {
  const supabase = createClient();
  const { data: prescription, error: prescError } = await supabase
    .from('patient_prescriptions')
    .insert({
      patient_id: patientId,
      date: new Date().toISOString().split('T')[0],
      validade: prescData.validade,
      status: 'ATIVA',
    })
    .select()
    .single();
  if (prescError) throw prescError;

  if (prescData.items.length > 0) {
    const { error: itemsError } = await supabase
      .from('prescription_items')
      .insert(prescData.items.map((item: any) => ({ prescription_id: prescription.id, ...item })));
    if (itemsError) throw itemsError;
  }
  return prescription;
}

export async function insertExam(
  patientId: string,
  examData: { name: string; date: string; lab: string; urgencia: string }
): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patient_exams')
    .insert({
      patient_id: patientId,
      name: examData.name,
      date: examData.date || new Date().toISOString().split('T')[0],
      lab: examData.lab || 'A definir',
      status: 'SOLICITADO',
      urgencia: examData.urgencia,
      resultado: 'Aguardando resultado',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Patient Insert / Update ───────────────────────────────────────────────────

async function generatePatientId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.from('patients').select('id');
  const existing = new Set((data ?? []).map((r: any) => r.id));
  for (let attempts = 0; attempts < 20; attempts++) {
    const digits = String(Math.floor(Math.random() * 9000) + 1000);
    const id = `P${digits}`;
    if (!existing.has(id)) return id;
  }
  // Fallback: timestamp-based
  return `P${Date.now().toString().slice(-4)}`;
}

function buildPatientRow(payload: any): Record<string, any> {
  const addr = payload.address ?? {};
  const row: Record<string, any> = {
    full_name: payload.full_name,
    birth_date: payload.birth_date || null,
    sex: payload.sex === 'OUTRO' ? null : (payload.sex || null),
    phone: payload.phone || null,
    email: payload.email || null,
    cpf: payload.cpf || null,
    rg: payload.rg || null,
    nationality: payload.nationality || 'BR',
    address_zip: addr.cep || null,
    address_street: addr.street || null,
    address_number: addr.number || null,
    address_complement: addr.complement || null,
    address_neighborhood: addr.neighborhood || null,
    address_city: addr.city || null,
    address_state: addr.state || null,
    tier: payload.tier || 'SILVER',
    tipo_contato: payload.tipo_contato || 'WHATSAPP',
    mala_direta: payload.mala_direta ?? false,
    tags: payload.tags ?? [],
    notes: payload.notes || null,
    photo_url: payload.photo_url || null,
  };
  // Remove undefined/null keys that weren't explicitly set to null
  return row;
}

export async function insertPatient(payload: any): Promise<any> {
  const supabase = createClient();
  const id = await generatePatientId();
  const row = {
    ...buildPatientRow(payload),
    id,
    current_status: 'NOVA_LEAD',
  };
  const { data, error } = await supabase
    .from('patients')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatient(patientId: string, payload: any): Promise<any> {
  const supabase = createClient();
  const row = buildPatientRow(payload);
  const { data, error } = await supabase
    .from('patients')
    .update(row)
    .eq('id', patientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchDashboardOverview(): Promise<any> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  // Today's appointments
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('id, status, patients(full_name, tier), professionals(name), start_time, type, procedure_name')
    .gte('start_time', `${today}T00:00:00`)
    .lte('start_time', `${today}T23:59:59`);

  const total = todayAppts?.length ?? 0;
  const completed = todayAppts?.filter((a: any) => a.status === 'COMPLETED').length ?? 0;
  const checked_in = todayAppts?.filter((a: any) => ['CHECKED_IN', 'IN_PROGRESS'].includes(a.status)).length ?? 0;

  // Active patients
  const { count: activeCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .neq('current_status', 'INATIVO');

  // New patients this month
  const { count: newCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', monthStart);

  // Monthly revenue
  const { data: revData } = await supabase
    .from('financial_transactions')
    .select('pago')
    .eq('tipo', 'RECEBER')
    .in('status', ['PAGO', 'PARCIAL'])
    .gte('pago_em', monthStart);
  const monthly_revenue = revData?.reduce((s: number, t: any) => s + Number(t.pago ?? 0), 0) ?? 0;

  // Pending transactions
  const { count: pendingCount } = await supabase
    .from('financial_transactions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['ABERTO', 'PARCIAL'])
    .eq('tipo', 'RECEBER');

  // Open alerts
  const { count: alertsCount } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'OPEN');

  // Recent completed appointments
  const recent = (todayAppts ?? [])
    .filter((a: any) => a.status === 'COMPLETED')
    .slice(0, 5)
    .map((a: any) => ({
      id: a.id,
      patient_name: a.patients?.full_name ?? 'Paciente',
      tier: a.patients?.tier ?? 'SILVER',
      professional: a.professionals?.name ?? '—',
      type: a.type ?? 'CONSULTATION',
      start_time: a.start_time,
    }));

  const occupation_rate = total > 0 ? Math.round((checked_in + completed) / total * 100) : 0;

  return {
    today: { total, completed, checked_in, occupation_rate },
    patients: { active: activeCount ?? 0, new_this_month: newCount ?? 0 },
    financial: { monthly_revenue, pending_count: pendingCount ?? 0 },
    alerts: { pending_decisions: alertsCount ?? 0, low_stock: 0 },
    recent_appointments: recent,
  };
}

// ── Patient Detail ────────────────────────────────────────────────────────────

export async function fetchPatientById(patientId: string): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*, appointments(id, start_time, end_time, status, type, professional_id, professionals(name))')
    .eq('id', patientId)
    .order('start_time', { referencedTable: 'appointments', ascending: false })
    .single();
  if (error) throw error;
  return data;
}

// ── Appointments ──────────────────────────────────────────────────────────────

export async function fetchAppointmentsByDate(dateStr: string) {
  const supabase = createClient();
  const start = `${dateStr}T00:00:00.000Z`;
  const end = `${dateStr}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients ( full_name, phone, tier ),
      professionals ( name, color )
    `)
    .gte('start_time', start)
    .lte('start_time', end)
    .order('start_time');

  if (error) throw error;
  return data ?? [];
}

// ── Alerts ────────────────────────────────────────────────────────────────────

function suggestedActionsForType(type: string): { key: string; label: string }[] {
  switch (type) {
    case 'RETORNO': return [{ key: 'contact', label: 'Enviar mensagem' }, { key: 'schedule', label: 'Agendar retorno' }];
    case 'FINANCEIRO': return [{ key: 'payment', label: 'Registrar pagamento' }];
    case 'PROTOCOLO': return [{ key: 'schedule', label: 'Agendar sessão' }];
    default: return [{ key: 'view', label: 'Ver detalhes' }];
  }
}

export async function fetchAlerts(): Promise<any[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('alerts')
    .select('*, patients(id, full_name)')
    .in('status', ['OPEN', 'ACKNOWLEDGED'])
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    message: a.description ?? '',
    severity: a.severity,
    status: a.status,
    category: (a.type ?? 'CLINICO').toLowerCase(),
    rationale: [],
    suggested_actions: suggestedActionsForType(a.type),
    patient: a.patients ? { id: a.patients.id, full_name: a.patients.full_name } : undefined,
    created_at: a.created_at,
  }));
}

export async function updateAlertStatus(id: string, status: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('alerts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function insertAlert(data: {
  title: string;
  description?: string;
  type: string;
  severity: string;
  patient_id?: string;
  due_date?: string;
}): Promise<any> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('alerts')
    .insert({ ...data, status: 'OPEN' })
    .select('*, patients(id, full_name)')
    .single();
  if (error) throw error;
  return {
    id: row.id,
    title: row.title,
    message: row.description ?? '',
    severity: row.severity,
    status: row.status,
    category: (row.type ?? 'CLINICO').toLowerCase(),
    rationale: [],
    suggested_actions: suggestedActionsForType(row.type),
    patient: row.patients ? { id: row.patients.id, full_name: row.patients.full_name } : undefined,
    created_at: row.created_at,
  };
}

// ── Appointments mutations ────────────────────────────────────────────────────

export async function insertAppointment(data: {
  patient_id: string;
  professional_id: string;
  start_time: string;
  end_time: string;
  type?: string;
  notes?: string;
  procedure_name?: string;
  convenio?: string;
  service_id?: string;
}): Promise<any> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('appointments')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function updateAppointmentStatus(id: string, status: string): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function closeDailyAppointments(dateStr: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'NO_SHOW' })
    .in('status', ['SCHEDULED', 'CONFIRMED'])
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('start_time', `${dateStr}T23:59:59`);
  if (error) throw error;
}
