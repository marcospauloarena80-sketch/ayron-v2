'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, FileText, DollarSign,
  Package, MessageSquare, BarChart3, Brain, Settings, Search,
  Zap, Activity, FilePlus, UserPlus,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  function go(path: string) {
    router.push(path);
    onClose();
  }

  const items: CommandItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, action: () => go('/dashboard'), group: 'Navegação', description: 'Visão geral da clínica' },
    { id: 'patients', label: 'Pacientes', icon: <Users className="h-4 w-4" />, action: () => go('/patients'), group: 'Navegação', description: 'Lista de pacientes' },
    { id: 'agenda', label: 'Agenda', icon: <Calendar className="h-4 w-4" />, action: () => go('/agenda'), group: 'Navegação', description: 'Calendário e agendamentos' },
    { id: 'clinical', label: 'Modo Médico', icon: <FileText className="h-4 w-4" />, action: () => go('/clinical'), group: 'Navegação', description: 'Consulta ativa / prontuários' },
    { id: 'financial', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" />, action: () => go('/financial'), group: 'Navegação' },
    { id: 'inventory', label: 'Estoque', icon: <Package className="h-4 w-4" />, action: () => go('/inventory'), group: 'Navegação' },
    { id: 'messages', label: 'Mensagens', icon: <MessageSquare className="h-4 w-4" />, action: () => go('/messages'), group: 'Navegação' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, action: () => go('/analytics'), group: 'Navegação' },
    { id: 'ayron', label: 'AYRON IA', icon: <Brain className="h-4 w-4" />, action: () => go('/ayron'), group: 'Navegação', description: 'Assistente cognitivo' },
    { id: 'settings', label: 'Configurações', icon: <Settings className="h-4 w-4" />, action: () => go('/settings'), group: 'Navegação' },
    { id: 'new-patient', label: 'Novo Paciente', icon: <UserPlus className="h-4 w-4" />, action: () => { go('/patients'); }, group: 'Ações Rápidas', description: 'Cadastrar novo paciente' },
    { id: 'new-appointment', label: 'Novo Agendamento', icon: <Calendar className="h-4 w-4" />, action: () => go('/agenda'), group: 'Ações Rápidas' },
    { id: 'new-document', label: 'Nova Receita', icon: <FilePlus className="h-4 w-4" />, action: () => go('/clinical'), group: 'Ações Rápidas', description: 'Ir para consulta ativa' },
    { id: 'metrics', label: 'Registrar Métricas', icon: <Activity className="h-4 w-4" />, action: () => go('/clinical'), group: 'Ações Rápidas' },
    { id: 'implant', label: 'Registrar Implante', icon: <Zap className="h-4 w-4" />, action: () => go('/clinical'), group: 'Ações Rápidas' },
  ];

  const groups = [...new Set(items.map(i => i.group))];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-xl"
            onClick={e => e.stopPropagation()}
          >
            <Command
              className="overflow-hidden rounded-2xl border border-border bg-white/95 backdrop-blur-xl shadow-2xl ring-1 ring-black/5"
              shouldFilter={true}
            >
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Buscar páginas, ações..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>
              <Command.List className="max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado.
                </Command.Empty>
                {groups.map(group => {
                  const groupItems = items.filter(i => i.group === group);
                  return (
                    <Command.Group key={group} heading={<span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group}</span>}>
                      {groupItems.map(item => (
                        <Command.Item
                          key={item.id}
                          value={item.label + ' ' + (item.description ?? '')}
                          onSelect={item.action}
                          className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-sm text-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                        >
                          <span className="text-muted-foreground aria-selected:text-primary">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{item.label}</span>
                            {item.description && <span className="text-xs text-muted-foreground ml-2">{item.description}</span>}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>
              <div className="border-t border-border px-4 py-2 flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px]">↑↓</kbd> navegar &nbsp;
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px]">↵</kbd> selecionar &nbsp;
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px]">⌘K</kbd> fechar
                </span>
              </div>
            </Command>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 -z-10 bg-black/20 backdrop-blur-sm"
          />
        </div>
      )}
    </AnimatePresence>
  );
}
