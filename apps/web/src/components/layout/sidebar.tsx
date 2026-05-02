'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Calendar, FileText, BarChart3,
  Package, MessageSquare, Brain, Settings, LogOut, DollarSign, Bell, ClipboardList,
  Megaphone, Repeat2, Star, HelpCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Pacientes', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/clinical', label: 'Prontuários', icon: FileText },
  { href: '/financial', label: 'Financeiro', icon: DollarSign },
  { href: '/sessions', label: 'Sessões', icon: Repeat2 },
  { href: '/inventory', label: 'Estoque', icon: Package, badgeKey: 'inventory' },
  { href: '/messages', label: 'Mensagens', icon: MessageSquare },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/alerts', label: 'Alertas', icon: Bell, badgeKey: 'alerts' },
  { href: '/inbox', label: 'Inbox', icon: ClipboardList, badgeKey: 'tasks' },
  { href: '/analytics', label: 'Insights', icon: BarChart3 },
  { href: '/qualidade', label: 'Qualidade', icon: Star },
  { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
  { href: '/ayron', label: 'AYRON', icon: Brain },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore(s => s.logout);

  const { data: countData } = useQuery({
    queryKey: ['alerts-count'],
    queryFn: () => api.get('/alerts/count').then(r => r.data).catch(() => ({ total: 0 })),
    refetchInterval: 60_000,
  });

  const { data: taskCountData } = useQuery({
    queryKey: ['tasks-count'],
    queryFn: () => api.get('/tasks/count').then(r => r.data).catch(() => ({ total: 0, overdue: 0 })),
    refetchInterval: 60_000,
  });

  const { data: inventoryKPIs } = useQuery({
    queryKey: ['inventory-dashboard-count'],
    queryFn: () => api.get('/inventory/dashboard').then(r => r.data).catch(() => ({ expired: 0, critical_items: 0 })),
    refetchInterval: 300_000,
  });
  const inventoryCount: number = (inventoryKPIs?.expired ?? 0) + (inventoryKPIs?.critical_items ?? 0);

  const alertCount: number = countData?.total ?? 0;
  const taskCount: number = (taskCountData?.total ?? 0) + (taskCountData?.overdue ?? 0);

  function getBadgeCount(badgeKey?: string): number {
    if (!badgeKey) return 0;
    if (badgeKey === 'alerts') return alertCount;
    if (badgeKey === 'tasks') return taskCount;
    if (badgeKey === 'inventory') return inventoryCount;
    return 0;
  }

  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Sync collapsed state from localStorage after mount (avoids SSR/client hydration mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem('ayron_sidebar_collapsed') === 'true') {
        setCollapsed(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('ayron_sidebar_collapsed', String(collapsed)); }
    catch {}
  }, [collapsed]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className={cn(
      'flex h-screen flex-col border-r border-white/30 transition-all duration-200 z-20',
      '[background:var(--glass-bg-strong)] [backdrop-filter:blur(20px)] [-webkit-backdrop-filter:blur(20px)]',
      '[box-shadow:2px_0_16px_rgba(0,0,0,0.06)]',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className={cn('flex h-16 items-center border-b border-white/30', collapsed ? 'justify-center px-0' : 'gap-2 px-6')}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0 [box-shadow:0_2px_8px_rgba(255,106,0,0.35)]">
          <Brain className="h-4 w-4 text-white" />
        </div>
        {!collapsed && <span className="text-lg font-bold tracking-tight text-secondary">AYRON</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV.map(({ href, label, icon: Icon, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          const count = getBadgeCount(badgeKey);
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                title={collapsed ? label : undefined}
                className={cn(
                  'relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors mb-0.5',
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  active
                    ? [
                        'text-primary font-medium',
                        'bg-gradient-to-r from-primary/20 to-primary/5',
                        '[box-shadow:inset_0_0_0_1px_rgba(255,106,0,0.20),0_2px_8px_rgba(255,106,0,0.15)]',
                      ].join(' ')
                    : [
                        'text-muted-foreground',
                        'hover:bg-white/60 hover:text-foreground',
                        'hover:[box-shadow:var(--shadow-soft)]',
                      ].join(' '),
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && count > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
                {collapsed && count > 0 && (
                  <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/30 p-3 space-y-1">
        <Link href="/settings">
          <div
            title={collapsed ? 'Configurações' : undefined}
            className={cn(
              'flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/60 hover:text-foreground cursor-pointer transition-all duration-[150ms]',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!collapsed && 'Configurações'}
          </div>
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'w-full flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50/70 hover:text-red-600 transition-colors',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && 'Sair'}
        </button>
        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expandir sidebar' : 'Minimizar sidebar'}
          className={cn(
            'w-full flex items-center rounded-lg py-2 text-xs text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all duration-[150ms]',
            collapsed ? 'justify-center px-0' : 'gap-2 px-3'
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-3.5 w-3.5" /><span>Minimizar</span></>
          }
        </button>
      </div>
    </aside>
  );
}
