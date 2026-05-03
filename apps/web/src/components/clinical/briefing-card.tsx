'use client';
import { useQuery } from '@tanstack/react-query';
import { Brain, Clock, Pill, FlaskConical, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPatientBriefing } from '@/lib/supabase/briefing-queries';

interface BriefingCardProps {
  patientId: string;
  onOpenEvolution: () => void; // navega para aba evolucoes
}

export function BriefingCard({ patientId, onOpenEvolution }: BriefingCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['briefing', patientId],
    queryFn: () => fetchPatientBriefing(patientId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-white/60 backdrop-blur-sm p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-48 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { lastEvolution, activePrescriptions, pendingExams } = data;
  const activeRx = activePrescriptions.filter(p => !p.isExpired);
  const hasPendingExams = pendingExams.length > 0;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Briefing da Última Consulta</p>
        </div>
        {lastEvolution && (
          <button
            onClick={onOpenEvolution}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver completo <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {!lastEvolution ? (
        <p className="text-xs text-muted-foreground">Nenhuma evolução registrada.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Última evolução */}
          <div className="rounded-lg bg-white/80 border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Última Consulta
              </span>
            </div>
            <p className="text-xs font-semibold">
              {new Date(lastEvolution.date).toLocaleDateString('pt-BR')} · {lastEvolution.type}
            </p>
            <p className={cn(
              'text-[11px] mt-0.5 font-medium',
              lastEvolution.daysSince > 30 ? 'text-amber-600' : 'text-muted-foreground',
            )}>
              {lastEvolution.daysSince === 0
                ? 'Hoje'
                : lastEvolution.daysSince === 1
                ? '1 dia atrás'
                : `${lastEvolution.daysSince} dias atrás`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {lastEvolution.subjetivo}
            </p>
            {lastEvolution.plano && (
              <p className="text-[11px] text-primary mt-1 line-clamp-1 font-medium">
                📋 {lastEvolution.plano}
              </p>
            )}
          </div>

          {/* Medicamentos ativos */}
          <div className="rounded-lg bg-white/80 border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Pill className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Medicamentos Ativos
              </span>
            </div>
            {activeRx.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma receita ativa</p>
            ) : (
              <div className="space-y-1">
                {activeRx.slice(0, 1).flatMap(rx =>
                  rx.items.slice(0, 3).map((item, i) => (
                    <p key={i} className="text-[11px] text-foreground leading-relaxed">
                      • {item.med}
                      {item.dosagem && <span className="text-muted-foreground"> — {item.dosagem}</span>}
                    </p>
                  ))
                )}
                {activeRx[0]?.items.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{activeRx[0].items.length - 3} item(s)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Exames pendentes */}
          <div className="rounded-lg bg-white/80 border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Exames Pendentes
              </span>
              {hasPendingExams && (
                <AlertTriangle className="h-3 w-3 text-amber-500 ml-auto" />
              )}
            </div>
            {!hasPendingExams ? (
              <p className="text-xs text-green-600 font-medium">✅ Sem pendências</p>
            ) : (
              <div className="space-y-1">
                {pendingExams.slice(0, 3).map(ex => (
                  <p key={ex.id} className="text-[11px] text-amber-700 leading-relaxed">
                    ⚠️ {ex.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
