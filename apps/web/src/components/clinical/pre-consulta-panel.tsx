'use client';
import { useQuery } from '@tanstack/react-query';
import { Scale, TrendingUp, TrendingDown, Minus, FlaskConical, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface PreConsultaPanelProps {
  patientId: string;
}

type Trend = 'IMPROVING' | 'STABLE' | 'WORSENING' | null;

interface MetricsEntry {
  weight_kg: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  bmi: number | null;
  created_at: string;
}

const TREND_ICON: Record<string, React.ReactNode> = {
  IMPROVING: <TrendingUp className="h-3 w-3 text-green-600" />,
  WORSENING: <TrendingDown className="h-3 w-3 text-red-500" />,
  STABLE: <Minus className="h-3 w-3 text-muted-foreground" />,
};

const NIVEL_COLORS: Record<string, string> = {
  ideal: 'bg-green-100 text-green-700',
  alto: 'bg-red-100 text-red-700',
  baixo: 'bg-amber-100 text-amber-700',
  NORMAL: 'bg-green-100 text-green-700',
  ALTERADO: 'bg-red-100 text-red-700',
  ATENCAO: 'bg-amber-100 text-amber-700',
};

function delta(curr: number | null, prev: number | null): string | null {
  if (curr == null || prev == null) return null;
  const d = curr - prev;
  if (Math.abs(d) < 0.01) return null;
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
}

export function PreConsultaPanel({ patientId }: PreConsultaPanelProps) {
  const { data: metricsHistory = [] } = useQuery<MetricsEntry[]>({
    queryKey: ['metrics-history', patientId],
    queryFn: () =>
      api.get(`/clinical/metrics/patient/${patientId}`).then(r =>
        Array.isArray(r.data) ? r.data : [],
      ),
    staleTime: 60_000,
  });

  const { data: recentExams = [] } = useQuery<any[]>({
    queryKey: ['exams-recent', patientId],
    queryFn: () =>
      api.get(`/exams/patient/${patientId}`).then(r =>
        Array.isArray(r.data) ? r.data : (r.data?.data ?? []),
      ),
    staleTime: 60_000,
  });

  const latest = metricsHistory[0] ?? null;
  const prev = metricsHistory[1] ?? null;

  // exams within last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recentExamFiltered = recentExams.filter(
    e => new Date(e.exam_date ?? e.created_at) >= cutoff,
  );

  const alteredMarkers = recentExamFiltered.flatMap(e =>
    (e.markers ?? []).filter((m: any) => m.status === 'ABOVE_IDEAL' || m.status === 'BELOW_IDEAL'),
  );

  if (!latest && recentExamFiltered.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-white/60 backdrop-blur-sm p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        📋 Pré-consulta — dados recentes
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Bioimpedância */}
        {latest && (
          <>
            {[
              { label: 'Peso', curr: latest.weight_kg, prev: prev?.weight_kg, unit: 'kg', warnFn: () => false },
              { label: 'GC %', curr: latest.body_fat_pct, prev: prev?.body_fat_pct, unit: '%', warnFn: (v: number) => v > 30 },
              { label: 'Massa magra', curr: latest.lean_mass_kg, prev: prev?.lean_mass_kg, unit: 'kg', warnFn: () => false },
              { label: 'IMC', curr: latest.bmi, prev: prev?.bmi, unit: '', warnFn: (v: number) => v > 30 || v < 18.5 },
            ].map(({ label, curr, prev: p, unit, warnFn }) => {
              const d = delta(curr, p);
              const warn = curr != null && warnFn(curr);
              return (
                <div key={label} className={cn(
                  'rounded-lg border p-3',
                  warn ? 'border-amber-200 bg-amber-50' : 'border-border bg-white',
                )}>
                  <div className="flex items-center gap-1 mb-1">
                    <Scale className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                  </div>
                  <p className={cn('text-sm font-bold', warn ? 'text-amber-700' : '')}>
                    {curr != null ? `${curr}${unit}` : '—'}
                  </p>
                  {d && (
                    <p className={cn(
                      'text-[10px] font-medium',
                      d.startsWith('-') ? 'text-green-600' : 'text-amber-600',
                    )}>
                      Δ {d}{unit}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Exames recentes alterados */}
      {alteredMarkers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Marcadores alterados (últimos 90 dias)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {alteredMarkers.slice(0, 8).map((m: any, i: number) => (
              <span
                key={i}
                title={`Valor: ${m.value}${m.unit ?? ''} | Ref: ${m.ideal_min ?? '?'}–${m.ideal_max ?? '?'}`}
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-help',
                  m.status === 'ABOVE_IDEAL'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200',
                )}
              >
                ⚠️ {m.marker_name}: {m.value}{m.unit ?? ''} ({m.status === 'ABOVE_IDEAL' ? '↑' : '↓'})
              </span>
            ))}
          </div>
        </div>
      )}

      {recentExamFiltered.length === 0 && !latest && (
        <p className="text-xs text-muted-foreground">Nenhum dado clínico recente.</p>
      )}
    </div>
  );
}
