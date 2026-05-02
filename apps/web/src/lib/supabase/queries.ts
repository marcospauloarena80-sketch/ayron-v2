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
