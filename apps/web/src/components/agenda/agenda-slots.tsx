'use client';
import { useMemo } from 'react';
import { format, setHours, setMinutes, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  patient?: { full_name: string };
  service?: { name: string; duration_min?: number };
  status: string;
  professional_id?: string;
}

interface Slot {
  time: Date;
  appointment: Appointment | null;
  isOccupied: boolean;
}

interface Props {
  date: Date;
  appointments: Appointment[];
  slotMinutes?: number; // 10 | 15 | 30 | 50
  startHour?: number;
  endHour?: number;
  onSlotClick: (slotTime: Date) => void;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 border-blue-200 text-blue-700',
  CONFIRMED: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  CHECKED_IN: 'bg-amber-50 border-amber-200 text-amber-700',
  IN_PROGRESS: 'bg-amber-50 border-amber-300 text-amber-800',
  COMPLETED: 'bg-green-50 border-green-200 text-green-700',
  CANCELLED: 'bg-red-50 border-red-100 text-red-400 line-through',
  MISSED: 'bg-red-50 border-red-100 text-red-400',
};
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', CHECKED_IN: 'Check-in',
  IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', MISSED: 'Faltou',
};

export function AgendaSlots({ date, appointments, slotMinutes = 30, startHour = 7, endHour = 20, onSlotClick }: Props) {
  const slots = useMemo(() => {
    const result: Slot[] = [];
    let current = setMinutes(setHours(date, startHour), 0);
    const end = setMinutes(setHours(date, endHour), 0);

    while (current < end) {
      const slotStart = current;
      const slotEnd = addMinutes(current, slotMinutes);

      // Find appointment that overlaps with this slot
      const appt = appointments.find(a => {
        if (['CANCELLED', 'MISSED'].includes(a.status)) return false;
        const aStart = new Date(a.start_time);
        const aEnd = new Date(a.end_time);
        return aStart < slotEnd && aEnd > slotStart;
      });

      result.push({ time: slotStart, appointment: appt ?? null, isOccupied: !!appt });
      current = slotEnd;
    }
    return result;
  }, [date, appointments, slotMinutes, startHour, endHour]);

  return (
    <div className="space-y-1">
      {slots.map((slot, i) => {
        const timeLabel = format(slot.time, 'HH:mm');
        if (slot.isOccupied && slot.appointment) {
          const appt = slot.appointment;
          // Only show on the "first" slot of this appointment to avoid repetition
          const apptStart = new Date(appt.start_time);
          const slotStartStr = format(slot.time, 'HH:mm');
          const apptStartStr = format(apptStart, 'HH:mm');
          const isFirstSlot = slotStartStr === apptStartStr || (apptStart >= slot.time && apptStart < addMinutes(slot.time, slotMinutes));

          if (!isFirstSlot) {
            return (
              <div key={i} className="flex items-center gap-3 h-8">
                <span className="w-10 text-right text-[10px] text-muted-foreground/50 flex-shrink-0">{timeLabel}</span>
                <div className="flex-1 h-5 rounded border border-dashed border-muted" />
              </div>
            );
          }

          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-10 text-right text-xs font-medium text-muted-foreground flex-shrink-0">{timeLabel}</span>
              <div className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${STATUS_COLORS[appt.status] ?? 'bg-muted border-border'}`}>
                <span className="font-semibold">{appt.patient?.full_name ?? 'Paciente'}</span>
                {appt.service && <span className="ml-2 opacity-70">{appt.service.name}</span>}
                <span className="ml-2 opacity-60">· {STATUS_LABELS[appt.status] ?? appt.status}</span>
              </div>
            </div>
          );
        }

        return (
          <div key={i} className="flex items-center gap-3 group">
            <span className="w-10 text-right text-xs text-muted-foreground flex-shrink-0">{timeLabel}</span>
            <button
              onClick={() => onSlotClick(slot.time)}
              className="flex-1 h-9 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
            >
              <Plus className="h-3 w-3" /> Agendar {timeLabel}
            </button>
          </div>
        );
      })}
    </div>
  );
}
