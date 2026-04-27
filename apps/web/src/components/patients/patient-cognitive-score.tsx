'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import api from '@/lib/api';

interface Props {
  patientId: string;
}

interface CognitiveScore {
  clinical_stability_score: number;
  retention_risk_score: number;
  composite_risk_score: number;
  calculated_at: string;
  score_trend?: string;
  current_band?: string;
  explanation_json: {
    css: { score: number; components: Record<string, number> };
    rrs: { score: number; components: Record<string, number> };
    crs: number;
    financial_priority: number;
  };
}

function riskBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 70) return { label: 'Risco Alto', color: 'text-red-700', bg: 'bg-red-100 border-red-300' };
  if (score >= 40) return { label: 'Risco Médio', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300' };
  return { label: 'Risco Baixo', color: 'text-green-700', bg: 'bg-green-100 border-green-300' };
}

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'UP') return <ArrowUp className="h-3.5 w-3.5 text-red-500" />;
  if (trend === 'DOWN') return <ArrowDown className="h-3.5 w-3.5 text-green-500" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400" />;
}

const COMPONENT_LABELS: Record<string, string> = {
  no_return_active_protocol: 'Sem retorno c/ protocolo ativo',
  implant_due_soon: 'Implante próximo da troca',
  weight_drop_no_adjustment: 'Queda de peso sem ajuste',
  missing_bioimpedance: 'Bioimpedância ausente',
  active_high_critical_alerts: 'Alertas HIGH/CRITICAL ativos',
  pending_charge_7d: 'Cobrança pendente >7 dias',
  multiple_misses_90d: '2+ faltas em 90 dias',
  interval_above_average: 'Intervalo acima da média',
  many_dismissed_alerts: '>3 alertas ignorados',
  no_future_appt_active_protocol: 'Sem agendamento futuro',
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs font-semibold text-right">{score}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-28">{label}</span>
    </div>
  );
}

export function PatientCognitiveScoreCard({ patientId }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { data: score, isLoading } = useQuery<CognitiveScore>({
    queryKey: ['cognitive-score', patientId],
    queryFn: () =>
      api.get(`/cognitive/patients/${patientId}/score`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />;
  if (!score) return null;

  const crs = score.composite_risk_score;
  const badge = riskBadge(crs);
  const calcTime = new Date(score.calculated_at).toLocaleString('pt-BR');

  const cssComponents = score.explanation_json?.css?.components ?? {};
  const rrsComponents = score.explanation_json?.rrs?.components ?? {};

  return (
    <div className={`border rounded-xl p-4 ${badge.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Score Cognitivo</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badge.color} ${badge.bg}`}>
            {badge.label}
          </span>
          <TrendIcon trend={score.score_trend} />
        </div>
        <span className="text-xs text-gray-400">Calc. {calcTime}</span>
      </div>

      <div className="space-y-2 mb-3">
        <ScoreBar label="Estabilidade Clínica" score={score.clinical_stability_score} color="bg-blue-400" />
        <ScoreBar label="Risco de Perda" score={score.retention_risk_score} color="bg-orange-400" />
        <ScoreBar label="Risco Composto" score={crs} color={crs >= 70 ? 'bg-red-500' : crs >= 40 ? 'bg-yellow-400' : 'bg-green-400'} />
      </div>

      <button
        className="text-xs text-blue-600 hover:underline"
        onClick={() => setShowBreakdown((v) => !v)}
      >
        {showBreakdown ? 'Ocultar breakdown' : 'Ver breakdown'}
      </button>

      {showBreakdown && (
        <div className="mt-2 text-xs space-y-1 bg-white/70 rounded-lg p-3 border border-gray-200">
          {Object.keys(cssComponents).length > 0 && (
            <div>
              <p className="font-semibold text-blue-700 mb-1">Instabilidade Clínica:</p>
              {Object.entries(cssComponents).map(([k]) => (
                <p key={k}>• {COMPONENT_LABELS[k] ?? k}</p>
              ))}
            </div>
          )}
          {Object.keys(rrsComponents).length > 0 && (
            <div className="mt-1">
              <p className="font-semibold text-orange-700 mb-1">Risco de Perda:</p>
              {Object.entries(rrsComponents).map(([k]) => (
                <p key={k}>• {COMPONENT_LABELS[k] ?? k}</p>
              ))}
            </div>
          )}
          <p className="mt-1 text-gray-500 text-xs">
            Calculado com base nos fatores acima
          </p>
        </div>
      )}
    </div>
  );
}
